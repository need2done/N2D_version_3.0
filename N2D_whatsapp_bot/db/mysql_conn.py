"""
=================================================
GramioGO – MySQL Connection Manager (FINAL FIXED)
=================================================

 Connection pooling
 UTF-8 safe
 Stable for FastAPI + scripts
 NO generator confusion
 Clean close handling
 Production ready
"""

import mysql.connector
from mysql.connector import Error
from mysql.connector.pooling import MySQLConnectionPool

from config import DB_CONFIG


# =================================================
# CONNECTION POOL
# =================================================

_POOL = None


def _create_pool():
    global _POOL

    if _POOL:
        return _POOL

    try:
        print(" Creating MySQL connection pool...")

        _POOL = MySQLConnectionPool(
            pool_name="gramiogo_pool",
            pool_size=32,
            host=DB_CONFIG["host"],
            user=DB_CONFIG["user"],
            password=DB_CONFIG["password"],
            database=DB_CONFIG["database"],
            port=DB_CONFIG.get("port", 3306),
            charset="utf8mb4",
            autocommit=False,
            connection_timeout=10,
        )


        return _POOL

    except Error as e:
        print(" MySQL POOL CREATION ERROR:", e)
        raise


# =================================================
# GET CONNECTION (IMPORTANT FIXED)
# =================================================

def get_db():
    """
    Returns a REAL DB connection (NOT generator)
    """

    try:
        pool = _create_pool()
        db = pool.get_connection()

        if not db.is_connected():
            raise Exception("MySQL connection failed")

        # Ensure UTF8
        cursor = db.cursor(buffered=True)
        cursor.execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci")
        try:
            if cursor.with_rows:
                cursor.fetchall()
        except Exception:
            pass
        cursor.close()

        return db   #  DIRECT RETURN (IMPORTANT)

    except Error as e:
        print(" MySQL CONNECTION ERROR:", e)
        raise


# =================================================
# SAFE CLOSE HELPERS
# =================================================

def close_cursor(cur):
    try:
        if cur:
            cur.close()
    except Exception:
        pass


def close_db(db):
    try:
        if db and db.is_connected():
            db.close()
    except Exception:
        pass