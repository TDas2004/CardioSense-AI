"""
database/database.py
SQLite database setup using SQLAlchemy (async) + tables for predictions history.
"""

from sqlalchemy import (
    create_engine, Column, Integer, Float, String, DateTime, Text, JSON
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json
import sqlite3

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database" / "heart_predictions.db"

DATABASE_URL = f"sqlite:///{DB_PATH}"

# Sync engine for init / migrations
engine = create_engine(
    DATABASE_URL.replace("sqlite:///", "sqlite:///"),
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    """User accounts for privacy."""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password_hash = Column(String)
    token = Column(String, index=True)  # Simple token-based auth


class PredictionHistory(Base):
    """Stores every prediction made by users."""
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_name = Column(String, default="Anonymous")
    patient_age = Column(Float)
    patient_sex = Column(String)
    city = Column(String, default="")
    user_id = Column(String, index=True, default="guest")

    # Input features (JSON)
    features_json = Column(Text)          # JSON string of all 13 input features

    # Prediction outputs
    risk_label = Column(String)           # Low / Medium / High
    risk_probability = Column(Float)      # 0.0 – 1.0
    risk_percent = Column(Float)          # 0 – 100
    model_used = Column(String)

    # SHAP
    shap_json = Column(Text)              # JSON of feature → shap value

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "patient_name": self.patient_name,
            "patient_age": self.patient_age,
            "patient_sex": self.patient_sex,
            "city": self.city,
            "user_id": self.user_id,
            "features": json.loads(self.features_json) if self.features_json else {},
            "risk_label": self.risk_label,
            "risk_probability": self.risk_probability,
            "risk_percent": self.risk_percent,
            "model_used": self.model_used,
            "shap_values": json.loads(self.shap_json) if self.shap_json else {},
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


def _get_existing_columns(cursor, table: str) -> set:
    """Return the set of column names currently in *table*."""
    cursor.execute(f"PRAGMA table_info({table})")
    return {row[1] for row in cursor.fetchall()}


def _get_existing_tables(cursor) -> set:
    """Return the set of table names in the database."""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    return {row[0] for row in cursor.fetchall()}


def run_migrations():
    """
    Safe, idempotent schema migrations using raw sqlite3.
    Runs on every startup; only applies changes that are missing.
    Never deletes data.
    """
    import logging
    log = logging.getLogger("db.migration")

    db_path = str(DB_PATH)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    tables = _get_existing_tables(cur)

    # ── 1. Ensure 'users' table exists ────────────────────────────────────────
    if "users" not in tables:
        log.info("[MIGRATION] Creating 'users' table")
        cur.execute("""
            CREATE TABLE users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                username      VARCHAR UNIQUE NOT NULL,
                password_hash VARCHAR NOT NULL,
                token         VARCHAR
            )
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)")
        cur.execute("CREATE INDEX IF NOT EXISTS ix_users_token    ON users(token)")
        conn.commit()
        tables.add("users")

    # ── 2. Ensure 'predictions' table exists ──────────────────────────────────
    if "predictions" not in tables:
        log.info("[MIGRATION] Creating 'predictions' table from scratch")
        # Will be created by SQLAlchemy's create_all below; nothing to do here.
    else:
        pred_cols = _get_existing_columns(cur, "predictions")

        # Add user_id column if missing
        if "user_id" not in pred_cols:
            log.info("[MIGRATION] Adding 'user_id' column to predictions")
            cur.execute(
                "ALTER TABLE predictions ADD COLUMN user_id VARCHAR DEFAULT 'guest'"
            )
            conn.commit()
            log.info("[MIGRATION] 'user_id' column added successfully")
        else:
            log.debug("[MIGRATION] 'user_id' already present — skipping")

    conn.close()


def init_db():
    """Create all tables (new installs) then run safe migrations (existing DBs)."""
    import logging
    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger("db.init")

    # 1. Create any missing tables via SQLAlchemy ORM
    try:
        Base.metadata.create_all(bind=engine)
        log.info("[DB] Schema creation complete")
    except Exception as e:
        log.error(f"[DB] create_all failed: {e}")

    # 2. Run raw-sqlite migrations for existing tables
    try:
        run_migrations()
        log.info("[DB] Migrations complete")
    except Exception as e:
        log.error(f"[DB] Migration error: {e}")


def get_db():
    """Dependency for FastAPI route injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

