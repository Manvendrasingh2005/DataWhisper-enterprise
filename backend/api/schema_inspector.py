"""
Dynamic Database Schema Introspector for DataWhisper.
Introspects tables, columns, data types, and foreign keys directly from
Django's active database connection (SQLite, PostgreSQL, MySQL, etc.).
"""
from django.db import connection

EXCLUDED_TABLE_PREFIXES = (
    'django_',
    'auth_',
    'sqlite_',
    'pg_',
    'sql_',
    'spatial_ref_sys',
)

EXCLUDED_TABLES = {
    'sqlite_sequence',
    'sqlite_stat1',
}

def get_allowed_tables():
    """Returns list of user/application tables in the database."""
    with connection.cursor() as cursor:
        table_names = connection.introspection.table_names(cursor)
        allowed = [
            t for t in table_names
            if not any(t.startswith(prefix) for prefix in EXCLUDED_TABLE_PREFIXES)
            and t not in EXCLUDED_TABLES
        ]
        return allowed

def introspect_schema():
    """
    Introspects the active database and returns a structured dictionary of
    tables, columns, types, and foreign keys.
    """
    tables = {}
    db_vendor = connection.vendor # 'sqlite', 'postgresql', 'mysql'

    with connection.cursor() as cursor:
        allowed_tables = get_allowed_tables()
        for table in allowed_tables:
            columns_info = connection.introspection.get_table_description(cursor, table)
            
            # Relations / Foreign Keys
            try:
                relations = connection.introspection.get_relations(cursor, table)
            except Exception:
                relations = {}

            cols = []
            for col in columns_info:
                col_name = col.name
                col_type = col.type_code or 'VARCHAR'
                
                # Check if this column is a foreign key
                fk_target = None
                if col_name in relations:
                    target_table = relations[col_name][1]
                    target_col = relations[col_name][0]
                    fk_target = f"{target_table}.{target_col}"

                cols.append({
                    "name": col_name,
                    "type": str(col_type),
                    "null_ok": col.null_ok,
                    "foreign_key": fk_target
                })

            tables[table] = {
                "name": table,
                "columns": cols
            }

    return {
        "vendor": db_vendor,
        "tables": tables
    }

def get_prompt_schema_map():
    """
    Constructs a detailed natural-language schema representation to instruct LLMs.
    Includes dialect-specific guidelines and business context.
    """
    schema = introspect_schema()
    vendor = schema["vendor"]
    lines = [
        f"Database Engine: {vendor.upper()}",
        f"You are a senior data engineer translating questions into optimized {vendor.upper()} SQL SELECT queries.",
        "",
        "Available Tables and Columns:"
    ]

    for table_name, table_data in schema["tables"].items():
        lines.append(f"Table: {table_name}")
        for col in table_data["columns"]:
            fk_note = f" (FK -> {col['foreign_key']})" if col["foreign_key"] else ""
            lines.append(f"  - {col['name']} ({col['type']}){fk_note}")
        lines.append("")

    lines.append("CRITICAL RULES:")
    lines.append("1. Return ONLY the raw SQL string (no markdown, no backticks, no explanations).")
    lines.append("2. Strictly write single SELECT statements only. Never write INSERT, UPDATE, DELETE, DROP, or ALTER.")
    lines.append("3. Only reference the tables and columns listed above.")
    lines.append("4. If asked about 'price', 'expensive', or 'cheapest', map to 'selling_price' if available.")
    lines.append("5. To calculate profit margin, use (selling_price - cost_price).")
    lines.append("6. If asked about 'low stock', assume stock_count < 50.")
    if vendor == 'sqlite':
        lines.append("7. Use SQLite compatible functions (e.g., strftime('%Y-%m', col), date('now', '-30 days'), round()).")
    elif vendor == 'postgresql':
        lines.append("7. Use PostgreSQL compatible functions (e.g., TO_CHAR(col, 'YYYY-MM'), NOW() - INTERVAL '30 days').")
    
    return "\n".join(lines), schema
