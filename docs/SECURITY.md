# DataWhisper Security Model & Query Sandbox Architecture 🛡️

DataWhisper is designed to expose analytical database querying to business users via natural language without risking data corruption, unauthorized privilege escalation, or credential leakage.

To achieve this, the platform implements a **multi-layered Defense-in-Depth architecture**:

```text
[ Natural Language Query ]
            │
            ▼
┌───────────────────────────────────────┐
│   1. Dialect-Constrained LLM Prompt   │ ── Strict System Instructions ("SELECT-only")
└───────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│   2. AST Syntax Tree Security Sandbox │ ── sqlparse AST: Blocks Multi-statements & DDL/DML
└───────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│   3. Table Whitelist Isolation        │ ── Blocks system schemas, auth_user, sessions
└───────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────┐
│   4. Database Transaction Sandbox     │ ── Read-only session parameters & row limits
└───────────────────────────────────────┘
```

---

## 🔒 1. AST-Level SQL Sandbox (`backend/api/security.py`)

Rather than relying on basic regular expression filters—which are notoriously vulnerable to evasion through comment smuggling (`--`, `/* */`) or whitespace tricks—DataWhisper parses SQL into an **Abstract Syntax Tree (AST)** using `sqlparse`.

### Sandbox Verification Rules:
1. **Single Statement Enforcement**:
   - Chained statements separated by semicolons (e.g., `SELECT 1; DROP TABLE api_order;`) are rejected immediately (`len(parsed) == 1`).
2. **Command Type Whitelist**:
   - Only commands where `statement.get_type() == 'SELECT'` are permitted.
   - Any attempt to run `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, or `REPLACE` yields `HTTP 403 Forbidden`.
3. **Prohibited Keyword Lexicon**:
   - The sandbox blocks dangerous database engine functions, execution primitives, and administration routines:
     ```python
     BLOCKED_KEYWORDS = {
         'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE',
         'CREATE', 'REPLACE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE',
         'ATTACH', 'DETACH', 'PRAGMA', 'LOAD_EXTENSION', 'COPY'
     }
     ```
4. **Table Access Whitelist**:
   - The AST extracts all table identifiers referenced in `FROM` and `JOIN` clauses.
   - System tables (`sqlite_*`, `pg_*`, `information_schema`, `django_*`, `auth_*`) are explicitly banned.
   - Only explicitly whitelisted business domain tables (`api_order`, `api_orderitem`, `api_product`, `api_supplier`, `api_user`, `api_payment`, `api_inventorylog`) are allowed to execute.

---

## 🔌 2. External Database Session Isolation (`backend/api/db_connector.py`)

When analysts connect external databases, DataWhisper enforces read-only session isolation at the database protocol level:

### PostgreSQL:
- Sessions are initiated with read-only transaction constraints:
  ```sql
  SET TRANSACTION READ ONLY;
  SET statement_timeout = 5000; -- 5 second query timeout
  ```
- Prevents write operations even if a malicious user bypasses AST checks.

### SQLite:
- Connected using read-only URI flags (`file:path?mode=ro`), preventing file write access at the OS filesystem layer.

### Result Limits:
- Every query is constrained by a server-side maximum row cap (default `500` records) to prevent denial-of-service via memory exhaustion.

---

## 🔑 3. Authentication & API Security

1. **JWT (JSON Web Tokens)**:
   - Built on `djangorestframework-simplejwt`.
   - Access tokens have short-lived TTLs (60 minutes).
   - Protected endpoints require `Authorization: Bearer <token>` headers.
2. **CORS Isolation**:
   - Cross-Origin Resource Sharing is restricted in production to registered client domains via `CORS_ALLOWED_ORIGINS`.
3. **AST Error Masking**:
   - Security sandbox rejections return sanitized error messages without leaking internal server directory paths or connection strings.

---

## 🧪 4. Automated Security Verification

The automated test suite (`backend/api/tests.py`) runs continuous integration checks validating the AST sandbox against common injection and evasion vectors:

```bash
python manage.py test api.tests.SecuritySandboxTestCase
```

Tested attack patterns:
- Stacked queries (`SELECT * FROM api_product; DROP TABLE api_order;`)
- Destructive updates (`UPDATE api_user SET status = 'admin'`)
- System table probing (`SELECT * FROM auth_user`)
- SQLite pragma injection (`PRAGMA table_info(api_user)`)
- Extension loading (`SELECT load_extension('malicious.so')`)
