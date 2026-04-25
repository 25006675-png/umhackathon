from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3


DB_PATH = Path(__file__).with_name("ternakai.db")
SEED_DIR = Path(__file__).resolve().parents[2] / "data" / "seed"
BASELINE_SEED_PATH = SEED_DIR / "baseline_readings.json"
OUTBREAK_SEED_PATH = SEED_DIR / "outbreak_scenario.json"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def row_to_dict(row):
    return dict(row) if row else None


def _normalize_date_value(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _default_start_date(age_days: int):
    return (datetime.now().date() - timedelta(days=age_days)).isoformat()


def _ensure_schema(connection):
    flock_columns = {
        row["name"] for row in connection.execute("PRAGMA table_info(flocks)").fetchall()
    }
    if "start_date" not in flock_columns:
        connection.execute("ALTER TABLE flocks ADD COLUMN start_date TEXT")

    reading_col_rows = connection.execute("PRAGMA table_info(readings)").fetchall()
    reading_columns = {row["name"] for row in reading_col_rows}
    if reading_columns and "water_intake_liters" not in reading_columns:
        connection.execute("ALTER TABLE readings ADD COLUMN water_intake_liters REAL")
    if reading_columns and "ventilation_condition" not in reading_columns:
        connection.execute("ALTER TABLE readings ADD COLUMN ventilation_condition TEXT")
    if reading_columns and "behaviour_flags" not in reading_columns:
        connection.execute("ALTER TABLE readings ADD COLUMN behaviour_flags TEXT")

    # Relax NOT NULL on readings so farmers can log one field at a time.
    if reading_col_rows and any(
        row["name"] in ("temperature_celsius", "feed_intake_kg", "mortality_count")
        and row["notnull"]
        for row in reading_col_rows
    ):
        connection.executescript(
            """
            CREATE TABLE readings_new (
                reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
                flock_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                temperature_celsius REAL,
                feed_intake_kg REAL,
                mortality_count INTEGER,
                farmer_notes TEXT,
                water_intake_liters REAL,
                ventilation_condition TEXT,
                behaviour_flags TEXT,
                FOREIGN KEY (flock_id) REFERENCES flocks(flock_id)
            );
            INSERT INTO readings_new (
                reading_id, flock_id, timestamp, temperature_celsius, feed_intake_kg,
                mortality_count, farmer_notes, water_intake_liters,
                ventilation_condition, behaviour_flags
            ) SELECT
                reading_id, flock_id, timestamp, temperature_celsius, feed_intake_kg,
                mortality_count, farmer_notes, water_intake_liters,
                ventilation_condition, behaviour_flags FROM readings;
            DROP TABLE readings;
            ALTER TABLE readings_new RENAME TO readings;
            """
        )

    summary_col_rows = connection.execute("PRAGMA table_info(daily_summaries)").fetchall()
    summary_columns = {row["name"] for row in summary_col_rows}
    if summary_columns and "completed_at" not in summary_columns:
        connection.execute("ALTER TABLE daily_summaries ADD COLUMN completed_at TEXT")

    # Relax NOT NULL on daily_summaries so partial days don't break carry-forward.
    if summary_col_rows and any(
        row["name"] in (
            "avg_temperature_celsius",
            "max_temperature_celsius",
            "feed_intake_kg",
            "mortality_count",
        ) and row["notnull"]
        for row in summary_col_rows
    ):
        connection.executescript(
            """
            CREATE TABLE daily_summaries_new (
                summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
                flock_id TEXT NOT NULL,
                reading_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'preliminary',
                check_count INTEGER NOT NULL DEFAULT 0,
                first_check_at TEXT,
                last_check_at TEXT,
                avg_temperature_celsius REAL,
                max_temperature_celsius REAL,
                feed_intake_kg REAL,
                water_intake_liters REAL,
                mortality_count INTEGER,
                ventilation_condition TEXT NOT NULL DEFAULT 'normal',
                behaviour_flags TEXT,
                farmer_notes TEXT,
                completed_at TEXT,
                UNIQUE (flock_id, reading_date)
            );
            INSERT INTO daily_summaries_new (
                summary_id, flock_id, reading_date, status, check_count,
                first_check_at, last_check_at, avg_temperature_celsius,
                max_temperature_celsius, feed_intake_kg, water_intake_liters,
                mortality_count, ventilation_condition, behaviour_flags,
                farmer_notes, completed_at
            ) SELECT
                summary_id, flock_id, reading_date, status, check_count,
                first_check_at, last_check_at, avg_temperature_celsius,
                max_temperature_celsius, feed_intake_kg, water_intake_liters,
                mortality_count, ventilation_condition, behaviour_flags,
                farmer_notes, completed_at FROM daily_summaries;
            DROP TABLE daily_summaries;
            ALTER TABLE daily_summaries_new RENAME TO daily_summaries;
            """
        )


def _reading_date(timestamp: str) -> str:
    return datetime.fromisoformat(timestamp).date().isoformat()


def _combine_notes(readings: list[dict]) -> str:
    notes: list[str] = []
    seen: set[str] = set()
    for reading in readings:
        note = (reading.get("farmer_notes") or "").strip()
        if note and note not in seen:
            seen.add(note)
            notes.append(note)
    return "\n".join(notes)


def _worst_ventilation(readings: list[dict]) -> str | None:
    ranking = {"normal": 0, "mild": 1, "strong": 2, "sensor_high": 3}
    worst: str | None = None
    worst_rank = -1
    for reading in readings:
        value = reading.get("ventilation_condition")
        if not value:
            continue
        current = str(value).lower()
        rank = ranking.get(current, 0)
        if rank > worst_rank:
            worst = current
            worst_rank = rank
    return worst


def _summarize_day(
    flock_id: str,
    reading_date: str,
    readings: list[dict],
    prior_summary: dict | None = None,
) -> dict:
    """Aggregate readings into one summary row.

    Cumulative fields (feed, water, mortality) use max across the day — the
    farmer enters a "total so far" value each check, so max = end-of-day total.
    Temperature is averaged across the day. If a field has no reading today,
    carry forward from the previous day's summary so risk scoring stays stable.
    """
    ordered = sorted(readings, key=lambda item: (item["timestamp"], item["reading_id"]))

    behaviours: list[str] = []
    seen_flags: set[str] = set()
    for reading in ordered:
        for flag in reading.get("behaviour_flags") or []:
            if flag not in seen_flags:
                seen_flags.add(flag)
                behaviours.append(flag)

    def _values(field: str) -> list:
        return [r[field] for r in ordered if r.get(field) is not None]

    temps = _values("temperature_celsius")
    avg_temp = sum(temps) / len(temps) if temps else None
    max_temp = max(temps) if temps else None

    feed_vals = _values("feed_intake_kg")
    feed = max(feed_vals) if feed_vals else None

    water_vals = _values("water_intake_liters")
    water = max(water_vals) if water_vals else None

    mort_vals = _values("mortality_count")
    mortality = max(mort_vals) if mort_vals else None

    ventilation = _worst_ventilation(ordered)

    if prior_summary:
        if avg_temp is None: avg_temp = prior_summary.get("avg_temperature_celsius")
        if max_temp is None: max_temp = prior_summary.get("max_temperature_celsius")
        if feed is None: feed = prior_summary.get("feed_intake_kg")
        if water is None: water = prior_summary.get("water_intake_liters")
        if mortality is None: mortality = prior_summary.get("mortality_count")
        if ventilation is None: ventilation = prior_summary.get("ventilation_condition")

    latest = ordered[-1]
    return {
        "flock_id": flock_id,
        "reading_date": reading_date,
        "status": "preliminary",
        "check_count": len(ordered),
        "first_check_at": ordered[0]["timestamp"],
        "last_check_at": latest["timestamp"],
        "avg_temperature_celsius": avg_temp,
        "max_temperature_celsius": max_temp,
        "feed_intake_kg": feed,
        "water_intake_liters": water,
        "mortality_count": mortality,
        "ventilation_condition": ventilation or "normal",
        "behaviour_flags": json.dumps(behaviours),
        "farmer_notes": _combine_notes(ordered),
    }


def load_demo_seed_data():
    with BASELINE_SEED_PATH.open("r", encoding="utf-8") as baseline_file:
        baseline_payload = json.load(baseline_file)
    with OUTBREAK_SEED_PATH.open("r", encoding="utf-8") as outbreak_file:
        outbreak_payload = json.load(outbreak_file)

    flock_payload = outbreak_payload["flock"]
    demo_flock = {
        "flock_id": flock_payload["flock_id"],
        "farm_id": outbreak_payload["farm"]["farm_id"],
        "flock_size": flock_payload["size"],
        "flock_age_days": flock_payload["age_days"],
        "start_date": flock_payload["start_date"],
    }

    demo_readings = []
    for reading in baseline_payload["readings"] + outbreak_payload["readings"]:
        demo_readings.append(
            {
                "flock_id": demo_flock["flock_id"],
                "timestamp": reading["timestamp"],
                "temperature_celsius": reading["temperature_celsius"],
                "feed_intake_kg": reading["feed_intake_kg"],
                "mortality_count": reading["mortality_count"],
                "farmer_notes": reading.get("farmer_notes"),
            }
        )

    return demo_flock, demo_readings


def init_db():
    demo_flock, demo_readings = load_demo_seed_data()
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS flocks (
                flock_id TEXT PRIMARY KEY,
                farm_id TEXT NOT NULL,
                flock_size INTEGER NOT NULL,
                flock_age_days INTEGER NOT NULL,
                start_date TEXT
            );

            CREATE TABLE IF NOT EXISTS readings (
                reading_id INTEGER PRIMARY KEY AUTOINCREMENT,
                flock_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                temperature_celsius REAL,
                feed_intake_kg REAL,
                mortality_count INTEGER,
                farmer_notes TEXT,
                FOREIGN KEY (flock_id) REFERENCES flocks(flock_id)
            );

            CREATE TABLE IF NOT EXISTS alerts (
                alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
                flock_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                level TEXT NOT NULL,
                score INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS feedback (
                feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
                flock_id TEXT NOT NULL,
                action_taken TEXT NOT NULL,
                outcome TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS daily_summaries (
                summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
                flock_id TEXT NOT NULL,
                reading_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'preliminary',
                check_count INTEGER NOT NULL DEFAULT 0,
                first_check_at TEXT,
                last_check_at TEXT,
                avg_temperature_celsius REAL,
                max_temperature_celsius REAL,
                feed_intake_kg REAL,
                water_intake_liters REAL,
                mortality_count INTEGER,
                ventilation_condition TEXT NOT NULL DEFAULT 'normal',
                behaviour_flags TEXT,
                farmer_notes TEXT,
                completed_at TEXT,
                UNIQUE (flock_id, reading_date)
            );
            """
        )
        _ensure_schema(connection)
        connection.execute(
            """
            INSERT OR REPLACE INTO flocks
            (flock_id, farm_id, flock_size, flock_age_days, start_date)
            VALUES (:flock_id, :farm_id, :flock_size, :flock_age_days, :start_date)
            """,
            demo_flock,
        )
        existing = connection.execute(
            "SELECT COUNT(*) AS count FROM readings WHERE flock_id = ?",
            (demo_flock["flock_id"],),
        ).fetchone()
        if existing["count"] != len(demo_readings):
            connection.execute(
                "DELETE FROM readings WHERE flock_id = ?",
                (demo_flock["flock_id"],),
            )
            connection.execute(
                "DELETE FROM alerts WHERE flock_id = ?",
                (demo_flock["flock_id"],),
            )
            connection.execute(
                "DELETE FROM feedback WHERE flock_id = ?",
                (demo_flock["flock_id"],),
            )
            connection.execute(
                "DELETE FROM daily_summaries WHERE flock_id = ?",
                (demo_flock["flock_id"],),
            )
            connection.executemany(
                """
                INSERT INTO readings
                (flock_id, timestamp, temperature_celsius, feed_intake_kg, mortality_count, farmer_notes)
                VALUES
                (:flock_id, :timestamp, :temperature_celsius, :feed_intake_kg, :mortality_count, :farmer_notes)
                """,
                demo_readings,
            )
        _rebuild_daily_summaries(connection, demo_flock["flock_id"])


def register_flock(
    flock_id: str,
    flock_size: int,
    farm_id: str,
    age_days: int,
    start_date: date | datetime | str | None = None,
):
    normalized_start_date = _normalize_date_value(start_date) or _default_start_date(age_days)
    with get_connection() as connection:
        _ensure_schema(connection)
        connection.execute(
            """
            INSERT OR REPLACE INTO flocks
            (flock_id, farm_id, flock_size, flock_age_days, start_date)
            VALUES (?, ?, ?, ?, ?)
            """,
            (flock_id, farm_id, flock_size, age_days, normalized_start_date),
        )
    return get_flock(flock_id)


def _deserialize_summary(row):
    if not row:
        return None
    data = dict(row)
    raw_flags = data.get("behaviour_flags")
    if isinstance(raw_flags, str) and raw_flags:
        try:
            data["behaviour_flags"] = json.loads(raw_flags)
        except (ValueError, TypeError):
            data["behaviour_flags"] = []
    elif raw_flags is None:
        data["behaviour_flags"] = []
    return data


def _rebuild_daily_summaries(connection, flock_id: str):
    rows = connection.execute(
        "SELECT * FROM readings WHERE flock_id = ? ORDER BY timestamp, reading_id",
        (flock_id,),
    ).fetchall()
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        reading = _deserialize_reading(row)
        grouped.setdefault(_reading_date(reading["timestamp"]), []).append(reading)

    existing_summaries = {
        row["reading_date"]: dict(row)
        for row in connection.execute(
            "SELECT * FROM daily_summaries WHERE flock_id = ?",
            (flock_id,),
        ).fetchall()
    }

    connection.execute(
        "DELETE FROM daily_summaries WHERE flock_id = ?",
        (flock_id,),
    )

    prior: dict | None = None
    for reading_date in sorted(grouped.keys()):
        readings = grouped[reading_date]
        summary = _summarize_day(flock_id, reading_date, readings, prior_summary=prior)
        existing = existing_summaries.get(reading_date)
        if existing and existing["status"] == "official":
            summary["status"] = "official"
            summary["completed_at"] = existing.get("completed_at")
        else:
            summary["completed_at"] = None
        connection.execute(
            """
            INSERT INTO daily_summaries (
                flock_id, reading_date, status, check_count, first_check_at, last_check_at,
                avg_temperature_celsius, max_temperature_celsius, feed_intake_kg, water_intake_liters,
                mortality_count, ventilation_condition, behaviour_flags, farmer_notes, completed_at
            ) VALUES (
                :flock_id, :reading_date, :status, :check_count, :first_check_at, :last_check_at,
                :avg_temperature_celsius, :max_temperature_celsius, :feed_intake_kg, :water_intake_liters,
                :mortality_count, :ventilation_condition, :behaviour_flags, :farmer_notes, :completed_at
            )
            """,
            summary,
        )
        prior = summary


def get_flock(flock_id: str):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM flocks WHERE flock_id = ?",
            (flock_id,),
        ).fetchone()
    return row_to_dict(row)


def add_reading(reading: dict):
    raw_timestamp = reading.get("timestamp")
    timestamp = raw_timestamp.isoformat() if isinstance(raw_timestamp, datetime) else raw_timestamp
    timestamp = timestamp or datetime.now(timezone(timedelta(hours=8))).isoformat()
    reading_date = _reading_date(timestamp)
    behaviour_flags = reading.get("behaviour_flags")
    behaviour_serialized = json.dumps(behaviour_flags) if behaviour_flags else None
    with get_connection() as connection:
        _ensure_schema(connection)
        existing_summary = connection.execute(
            "SELECT status FROM daily_summaries WHERE flock_id = ? AND reading_date = ?",
            (reading["flock_id"], reading_date),
        ).fetchone()
        if existing_summary and existing_summary["status"] == "official":
            raise ValueError(f"Reading date {reading_date} is already completed")
        cursor = connection.execute(
            """
            INSERT INTO readings
            (flock_id, timestamp, temperature_celsius, feed_intake_kg, mortality_count,
             farmer_notes, water_intake_liters, ventilation_condition, behaviour_flags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                reading["flock_id"],
                timestamp,
                reading["temperature_celsius"],
                reading["feed_intake_kg"],
                reading["mortality_count"],
                reading.get("farmer_notes"),
                reading.get("water_intake_liters"),
                reading.get("ventilation_condition"),
                behaviour_serialized,
            ),
        )
        reading_id = cursor.lastrowid
        _rebuild_daily_summaries(connection, reading["flock_id"])
    return get_reading(reading_id)


def _deserialize_reading(row):
    if not row:
        return None
    data = dict(row)
    raw_flags = data.get("behaviour_flags")
    if isinstance(raw_flags, str) and raw_flags:
        try:
            data["behaviour_flags"] = json.loads(raw_flags)
        except (ValueError, TypeError):
            data["behaviour_flags"] = []
    elif raw_flags is None:
        data["behaviour_flags"] = []
    return data


def get_reading(reading_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM readings WHERE reading_id = ?",
            (reading_id,),
        ).fetchone()
    return _deserialize_reading(row)


def get_readings(flock_id: str):
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM readings WHERE flock_id = ? ORDER BY timestamp, reading_id",
            (flock_id,),
        ).fetchall()
    return [_deserialize_reading(row) for row in rows]


def get_daily_summary(flock_id: str, reading_date: str):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT * FROM daily_summaries
            WHERE flock_id = ? AND reading_date = ?
            """,
            (flock_id, reading_date),
        ).fetchone()
    return _deserialize_summary(row)


def get_latest_daily_summary(flock_id: str):
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT * FROM daily_summaries
            WHERE flock_id = ?
            ORDER BY reading_date DESC
            LIMIT 1
            """,
            (flock_id,),
        ).fetchone()
    return _deserialize_summary(row)


def get_daily_summaries(flock_id: str, *, include_preliminary: bool = True):
    query = """
        SELECT * FROM daily_summaries
        WHERE flock_id = ?
    """
    params: list[object] = [flock_id]
    if not include_preliminary:
        query += " AND status = 'official'"
    query += " ORDER BY reading_date, summary_id"
    with get_connection() as connection:
        rows = connection.execute(query, params).fetchall()
    return [_deserialize_summary(row) for row in rows]


def complete_day(flock_id: str, reading_date: str):
    with get_connection() as connection:
        _ensure_schema(connection)
        row = connection.execute(
            """
            SELECT * FROM daily_summaries
            WHERE flock_id = ? AND reading_date = ?
            """,
            (flock_id, reading_date),
        ).fetchone()
        if not row:
            return None
        completed_at = datetime.now(timezone.utc).isoformat()
        connection.execute(
            """
            UPDATE daily_summaries
            SET status = 'official', completed_at = ?
            WHERE flock_id = ? AND reading_date = ?
            """,
            (completed_at, flock_id, reading_date),
        )
    return get_daily_summary(flock_id, reading_date)


def add_alert(flock_id: str, level: str, score: int):
    with get_connection() as connection:
        existing = connection.execute(
            """
            SELECT * FROM alerts
            WHERE flock_id = ? AND level = ? AND score = ?
            ORDER BY timestamp DESC, alert_id DESC
            LIMIT 1
            """,
            (flock_id, level, score),
        ).fetchone()
        if existing:
            return row_to_dict(existing)

        cursor = connection.execute(
            """
            INSERT INTO alerts (flock_id, timestamp, level, score)
            VALUES (?, ?, ?, ?)
            """,
            (flock_id, datetime.now().isoformat(), level, score),
        )
        alert_id = cursor.lastrowid
        row = connection.execute(
            "SELECT * FROM alerts WHERE alert_id = ?",
            (alert_id,),
        ).fetchone()
    return row_to_dict(row)


def get_alerts(flock_id: str):
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM alerts WHERE flock_id = ? ORDER BY timestamp DESC, alert_id DESC",
            (flock_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def delete_today_readings(flock_id: str) -> int:
    today = date.today().isoformat()
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM readings WHERE flock_id = ? AND DATE(timestamp) = ?",
            (flock_id, today),
        )
        connection.execute(
            "DELETE FROM daily_summaries WHERE flock_id = ? AND reading_date = ?",
            (flock_id, today),
        )
    return cursor.rowcount


def add_feedback(flock_id: str, action_taken: str, outcome: str):
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO feedback (flock_id, action_taken, outcome, timestamp)
            VALUES (?, ?, ?, ?)
            """,
            (flock_id, action_taken, outcome, datetime.now().isoformat()),
        )
    return {"feedback_id": cursor.lastrowid, "flock_id": flock_id}


init_db()
