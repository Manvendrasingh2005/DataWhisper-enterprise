"""
AST-Level SQL Security Sandbox for DataWhisper.
Enforces read-only, single-statement SELECT queries and restricts
table access to whitelisted application models.
"""
import sqlparse
from sqlparse.sql import IdentifierList, Identifier, Function
from sqlparse.tokens import Keyword, DML
from .schema_inspector import get_allowed_tables, EXCLUDED_TABLE_PREFIXES, EXCLUDED_TABLES

BLOCKED_KEYWORDS = {
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE',
    'CREATE', 'REPLACE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
    'ATTACH', 'DETACH', 'PRAGMA', 'LOAD_EXTENSION', 'COPY'
}

def extract_tables(parsed_statement):
    """
    Extracts table names from a parsed SQL statement AST.
    """
    tables = set()
    from_seen = False

    for token in parsed_statement.tokens:
        if token.is_whitespace:
            continue

        # Look for FROM or JOIN keywords
        if token.match(Keyword, 'FROM') or token.match(Keyword, 'JOIN') or 'JOIN' in token.value.upper():
            from_seen = True
            continue

        if from_seen:
            if isinstance(token, IdentifierList):
                for identifier in token.get_identifiers():
                    name = identifier.get_real_name()
                    if name:
                        tables.add(name.lower())
            elif isinstance(token, Identifier):
                name = token.get_real_name()
                if name:
                    tables.add(name.lower())
            elif token.ttype is Keyword:
                # Reached WHERE, GROUP BY, ORDER BY, LIMIT etc.
                from_seen = False

    return tables

def is_safe_sql(sql_str):
    """
    Validates SQL safety:
    1. Rejects empty query.
    2. Rejects multiple statements.
    3. Rejects any non-SELECT commands.
    4. Rejects blocked SQL keywords.
    5. Validates referenced tables against allowed database schema.
    """
    if not sql_str or not sql_str.strip():
        return False, "Query cannot be empty."

    parsed = sqlparse.parse(sql_str.strip())
    if not parsed:
        return False, "No valid SQL syntax detected."

    if len(parsed) > 1:
        return False, "Multiple SQL statements are strictly forbidden."

    statement = parsed[0]
    command_type = statement.get_type()

    if command_type != 'SELECT':
        return False, f"Security Violation: Only 'SELECT' statements are permitted. Detected '{command_type}'."

    # Scan for forbidden keywords anywhere in tokens
    upper_sql = sql_str.upper()
    for word in BLOCKED_KEYWORDS:
        # Check whole word match
        if f" {word} " in f" {upper_sql} " or f" {word}(" in f" {upper_sql} ":
            return False, f"Security Violation: Keyword '{word}' is strictly prohibited."

    # Verify tables against allowed whitelist
    extracted_tables = extract_tables(statement)
    allowed_tables = set(t.lower() for t in get_allowed_tables())

    for table in extracted_tables:
        table_lower = table.lower()
        if any(table_lower.startswith(p) for p in EXCLUDED_TABLE_PREFIXES) or table_lower in EXCLUDED_TABLES:
            return False, f"Security Violation: Access to system table '{table}' is strictly prohibited."
        if allowed_tables and table_lower not in allowed_tables:
            return False, f"Security Violation: Access to unauthorized table '{table}' is forbidden."

    return True, "Safe"
