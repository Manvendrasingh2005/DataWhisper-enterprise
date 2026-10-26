"""
External Database Connector for DataWhisper.
Supports dynamically connecting to external PostgreSQL and SQLite databases,
introspecting remote schemas, and safely executing read-only queries.
"""
import sqlite3
import urllib.parse
from .security import is_safe_sql

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False

EXCLUDED_EXTERNAL_PREFIXES = ('pg_', 'information_schema', 'sqlite_')

def parse_db_uri(db_uri):
    """Parses database URI and identifies vendor."""
    parsed = urllib.parse.urlparse(db_uri)
    scheme = parsed.scheme.lower()
    if scheme in ('postgres', 'postgresql'):
        return 'postgresql', parsed
    elif scheme in ('sqlite', 'sqlite3'):
        return 'sqlite', parsed
    raise ValueError(f"Unsupported database scheme '{scheme}'. Supported schemes: postgresql://, sqlite://")

def test_external_connection(db_uri):
    """
    Tests connectivity to an external database and retrieves basic metadata.
    """
    vendor, parsed = parse_db_uri(db_uri)

    if vendor == 'postgresql':
        if not PSYCOPG2_AVAILABLE:
            raise RuntimeError("psycopg2 is required for PostgreSQL connections.")
        try:
            conn = psycopg2.connect(
                dbname=parsed.path.lstrip('/'),
                user=parsed.username,
                password=parsed.password,
                host=parsed.hostname,
                port=parsed.port or 5432,
                connect_timeout=5
            )
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    ORDER BY table_name;
                """)
                tables = [r[0] for r in cur.fetchall()]
            conn.close()
            return {
                "success": True,
                "vendor": "postgresql",
                "table_count": len(tables),
                "tables": tables[:15]
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    elif vendor == 'sqlite':
        db_path = parsed.path
        if not db_path and parsed.netloc:
            db_path = parsed.netloc
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tables = [r[0] for r in cur.fetchall()]
            conn.close()
            return {
                "success": True,
                "vendor": "sqlite",
                "table_count": len(tables),
                "tables": tables[:15]
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

def introspect_external_schema(db_uri):
    """
    Introspects tables, columns, and data types from an external database.
    """
    vendor, parsed = parse_db_uri(db_uri)
    tables = {}

    if vendor == 'postgresql':
        conn = psycopg2.connect(
            dbname=parsed.path.lstrip('/'),
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port or 5432,
            connect_timeout=5
        )
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT table_name, column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                    ORDER BY table_name, ordinal_position;
                """)
                for t_name, c_name, d_type, is_null in cur.fetchall():
                    if t_name not in tables:
                        tables[t_name] = {"name": t_name, "columns": []}
                    tables[t_name]["columns"].append({
                        "name": c_name,
                        "type": d_type,
                        "null_ok": is_null == 'YES',
                        "foreign_key": None
                    })
        finally:
            conn.close()

    elif vendor == 'sqlite':
        db_path = parsed.path or parsed.netloc
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=5)
        try:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            tbl_names = [r[0] for r in cur.fetchall()]
            for t_name in tbl_names:
                tables[t_name] = {"name": t_name, "columns": []}
                cur.execute(f"PRAGMA table_info('{t_name}');")
                for col in cur.fetchall():
                    tables[t_name]["columns"].append({
                        "name": col[1],
                        "type": col[2] or "VARCHAR",
                        "null_ok": not col[3],
                        "foreign_key": None
                    })
        finally:
            conn.close()

    return {"vendor": vendor, "tables": tables}

def execute_external_query(db_uri, sql):
    """
    Safely executes a query on an external database enforcing read-only constraints.
    """
    is_safe, message = is_safe_sql(sql)
    if not is_safe:
        raise PermissionError(f"Security Sandbox Blocked: {message}")

    vendor, parsed = parse_db_uri(db_uri)

    if vendor == 'postgresql':
        conn = psycopg2.connect(
            dbname=parsed.path.lstrip('/'),
            user=parsed.username,
            password=parsed.password,
            host=parsed.hostname,
            port=parsed.port or 5432,
            connect_timeout=5
        )
        try:
            conn.set_session(readonly=True, autocommit=True)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql)
                if cur.description:
                    columns = [col.name for col in cur.description]
                    rows = cur.fetchall()
                    # Convert RealDictRow to standard dict
                    results = [dict(r) for r in rows]
                else:
                    columns, results = [], []
                return columns, results
        finally:
            conn.close()

    elif vendor == 'sqlite':
        db_path = parsed.path or parsed.netloc
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True, timeout=5)
        try:
            cur = conn.cursor()
            cur.execute(sql)
            if cur.description:
                columns = [col[0] for col in cur.description]
                rows = cur.fetchall()
                results = [dict(zip(columns, r)) for r in rows]
            else:
                columns, results = [], []
            return columns, results
        finally:
            conn.close()
