from datetime import datetime, timedelta
import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).with_name("ternakai.db")

now = datetime.now()
day_minus_3 = (now - timedelta(days=3)).isoformat()
day_minus_2 = (now - timedelta(days=2)).isoformat()
day_minus_1 = (now - timedelta(days=1)).isoformat()
today = now.isoformat()

DEMO_FLOCK = {
    "flock_id": "flock_demo",
    "farm_id": "farm_001",
    "flock_size": 5000,
    "flock_age_days": 28,
}

DEMO_READINGS = [
    {
        "flock_id": "flock_demo",
        "temperature_celsius": 30.1,
        "feed_intake_kg": 50.5,
        "mortality_count": 1,
        "farmer_notes": "Semua nampak sihat",
        "timestamp": day_minus_3,
    },
    {
        "flock_id": "flock_demo",
        "temperature_celsius": 29.9,
        "feed_intake_kg": 49.5,
        "mortality_count": 1,
        "farmer_notes": "Normal",
        "timestamp": day_minus_2,
    },
    {
        "flock_id": "flock_demo",
        "temperature_celsius": 30.5,
        "feed_intake_kg": 46.0,
        "mortality_count": 1,
        "farmer_notes": "ayam senyap sikit hari ini",
        "timestamp": day_minus_1,
    },
    {
        "flock_id": "flock_demo",
        "temperature_celsius": 33.2,
        "feed_intake_kg": 41.0,
        "mortality_count": 3,
        "farmer_notes": "kurang makan, nampak lemah, nafas laju",
        "timestamp": today,
    },
]


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def row_to_dict(row):
    return dict(row) if row else None


def init_db():
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS flocks (
                flock_id TEXT PRIMARY KEY,
                farm_id TEXT NOT NULL,
                flock_size INTEGER NOT NULL,
                flock_age_days INTEGER NOT NULL
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
        connection.execute(
            """
            INSERT OR IGNORE INTO flocks
            (flock_id, farm_id, flock_size, flock_age_days)
            VALUES (:flock_id, :farm_id, :flock_size, :flock_age_days)
            """,
            DEMO_FLOCK,
        )
        existing = connection.execute(
            "SELECT COUNT(*) AS count FROM readings WHERE flock_id = ?",
            (DEMO_FLOCK["flock_id"],),
        ).fetchone()
        if existing["count"] == 0:
            connection.executemany(
                """
                INSERT INTO readings
                (flock_id, timestamp, temperature_celsius, feed_intake_kg, mortality_count, farmer_notes)
                VALUES
                (:flock_id, :timestamp, :temperature_celsius, :feed_intake_kg, :mortality_count, :farmer_notes)
                """,
                DEMO_READINGS,
            )


def register_flock(flock_id: str, flock_size: int, farm_id: str, age_days: int):
    with get_connection() as connection:
        connection.execute(
            """
            INSERT OR REPLACE INTO flocks
            (flock_id, farm_id, flock_size, flock_age_days)
            VALUES (?, ?, ?, ?)
            """,
            (flock_id, farm_id, flock_size, age_days),
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
    timestamp = reading.get("timestamp") or datetime.now().isoformat()
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
