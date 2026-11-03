# DataWhisper Backend Service ⚙️

The backend service for **DataWhisper Enterprise** is built on **Django 6.0 / 5.2** and **Django REST Framework**, providing conversational natural language query processing, AST-level SQL validation, self-healing execution, and database schema introspection.

---

## 📂 Directory Structure

```text
backend/
├── api/
│   ├── management/commands/
│   │   └── seed_db.py         # Seeds rich enterprise sample dataset
│   ├── ai_engine.py           # Google Gemini GenAI SDK, hedged model race & instant insights
│   ├── db_connector.py        # External PostgreSQL & SQLite read-only executor
│   ├── models.py              # Retail & ERP domain models (Supplier, Product, Order, etc.)
│   ├── schema_inspector.py    # Dynamic schema introspector and dialect detector
│   ├── security.py            # AST-level SQL sandbox and table whitelisting
│   ├── tests.py               # Automated unit & integration test suite (11 tests)
│   ├── urls.py                # API endpoint routing
│   └── views.py               # REST API views (/api/ask/, /api/execute-raw/, etc.)
├── core/
│   ├── asgi.py
│   ├── settings.py            # Django configuration (CORS, JWT, WhiteNoise, dj-database-url)
│   ├── urls.py                # Root URL configuration & JWT auth routing
│   └── wsgi.py
├── build.sh                   # Deployment script for Render
├── Dockerfile                 # Multi-stage production container
├── manage.py
├── requirements.txt           # Clean UTF-8 locked dependencies
└── test_api.py                # Automated JWT API verification script
```

---

## 🧩 Subsystem Architecture & Module Descriptions

### 1. `api/ai_engine.py` — Ultra-Low Latency GenAI Pipeline
- **Speculative Hedged Model Execution**: Concurrently races `gemini-3.1-flash-lite` and `gemini-3.5-flash` in a `ThreadPoolExecutor`. The fastest model to return valid SQL wins immediately, canceling the sibling worker and eliminating 504/503 timeout stalls.
- **Client Connection Pooling**: Maintains a module-level singleton `genai.Client` to reuse open HTTP/2 TCP/TLS sockets, shaving ~500ms off every subsequent call.
- **In-Memory Schema Cache**: Caches introspected database tables, columns, and foreign key descriptions in memory for 300 seconds (`_cached_schema_map`), avoiding redundant schema lookups.
- **Instant Heuristic Insights & Chart Recommender (0.01ms)**: Replaces secondary LLM calls with deterministic statistical heuristics that compute category leaders, percentage shares, time-series peaks, or formatted totals mathematically with zero network overhead.

### 2. `api/security.py` — AST-Level SQL Sandbox
- **Single Statement Enforcement**: Disallows chained queries (semicolon batching) to prevent stacked execution attacks.
- **Command Whitelisting**: Strictly restricts queries to `SELECT` operations. Blocks all Data Manipulation (`INSERT`, `UPDATE`, `DELETE`) and Data Definition (`DROP`, `ALTER`, `TRUNCATE`, `CREATE`) keywords.
- **Table Isolation**: Cross-references every table name in the abstract syntax tree against `ALLOWED_TABLES` (whitelisting domain tables like `api_order`, `api_product` while shielding `auth_user`, `django_session`, and system catalog tables).

### 3. `api/schema_inspector.py` — Dynamic Dialect Introspector
- **Dialect Detection**: Detects database engine types (`sqlite`, `postgresql`, `mysql`) via Django's connection vendor abstraction.
- **Foreign Key Graphing**: Extracts relational constraints (`table_name`, `column_name`, `referenced_table`) to feed relational context into prompt prompts, enabling accurate multi-table `JOIN` query generation.

### 4. `api/db_connector.py` — External Database Gateway
- **Read-Only Transaction Isolation**: Connects to user-supplied PostgreSQL and SQLite URIs under strict read-only session configurations (`SET TRANSACTION READ ONLY` on PostgreSQL and read-only URI flags on SQLite).
- **Execution Limits**: Automatically imposes statement timeouts and row-count constraints (default `LIMIT 500`) to prevent runaway resource exhaustion.

---

## 🛠️ Setup & Running

### 1. Install Dependencies
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment
Create `.env` using `.env.example`:
```ini
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_django_secret_key
DATABASE_URL=sqlite:///db.sqlite3
```

### 3. Migrate and Seed Database
```bash
python manage.py migrate
python manage.py seed_db
```
The `seed_db` command creates:
- 4 Global Suppliers (Taiwan, Sweden, India, USA)
- 40 Products across 4 categories (Electronics, Apparel, Home & Kitchen, Software)
- 60 Corporate Clients across 6 global tech hubs
- 180+ Orders, 370+ OrderItems, Payments, and InventoryLogs spanning 120 days of simulated operations.

### 4. Run Development Server
```bash
python manage.py runserver
```
Backend API will be accessible at `http://127.0.0.1:8000`.

---

## 🧪 Running Tests

Execute the 11-test automated suite covering security, parsing, and REST endpoints:
```bash
python manage.py test api
```
