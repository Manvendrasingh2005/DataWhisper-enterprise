# DataWhisper Backend Service ⚙️

The backend service for **DataWhisper Enterprise** is built on **Django 6.0 / 5.2** and **Django REST Framework**, providing conversational natural language query processing, AST-level SQL validation, self-healing execution, and database schema introspection.

---

## 📂 Directory Structure

```text
backend/
├── api/
│   ├── management/commands/
│   │   └── seed_db.py         # Seeds rich enterprise sample dataset
│   ├── ai_engine.py           # Google Gemini GenAI SDK, self-healing & insight generator
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
