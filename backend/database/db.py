from datetime import date, datetime, timedelta
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
                temperature_celsius REAL NOT NULL,
                feed_intake_kg REAL NOT NULL,
                mortality_count INTEGER NOT NULL,
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
            connection.executemany(
                """
                INSERT INTO readings
                (flock_id, timestamp, temperature_celsius, feed_intake_kg, mortality_count, farmer_notes)
                VALUES
                (:flock_id, :timestamp, :temperature_celsius, :feed_intake_kg, :mortality_count, :farmer_notes)
                """,
                demo_readings,
            )


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
    timestamp = timestamp or datetime.now().isoformat()
    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO readings
            (flock_id, timestamp, temperature_celsius, feed_intake_kg, mortality_count, farmer_notes)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                reading["flock_id"],
                timestamp,
                reading["temperature_celsius"],
                reading["feed_intake_kg"],
                reading["mortality_count"],
                reading.get("farmer_notes"),
            ),
        )
        reading_id = cursor.lastrowid
    return get_reading(reading_id)


def get_reading(reading_id: int):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM readings WHERE reading_id = ?",
            (reading_id,),
        ).fetchone()
    return row_to_dict(row)


def get_readings(flock_id: str):
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM readings WHERE flock_id = ? ORDER BY timestamp, reading_id",
            (flock_id,),
        ).fetchall()
    return [dict(row) for row in rows]


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
