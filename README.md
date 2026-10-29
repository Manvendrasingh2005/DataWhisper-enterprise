# DataWhisper Enterprise 2.0 🚀

[![Django](https://img.shields.io/badge/Django-5.2%20%7C%206.0-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Flash-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

> **DataWhisper Enterprise** is an AI-powered conversational Business Intelligence (BI) platform that translates natural language questions into accurate, dialect-optimized SQL queries, executes them in a secure sandbox, self-heals syntax errors, and synthesizes executive insights with dynamic data visualizations.

---

## 🌟 Key Features

- **🗣️ Natural Language to SQL**: Ask complex business questions in plain English (*"Calculate net profit margin by category"*, *"What is the failure rate of UPI payments?"*).
- **🛡️ AST-Level Security Sandbox**: Parses SQL using Abstract Syntax Trees (`sqlparse`) to enforce strictly read-only single `SELECT` statements and whitelist allowed tables (blocking access to credentials, sessions, and system schemas).
- **🩺 Self-Healing SQL Engine**: Catches database runtime/syntax errors and automatically feeds error tracebacks back to Gemini to auto-repair queries on the fly.
- **🔌 Multi-Database Support**: Connect external PostgreSQL or SQLite databases via connection string, introspecting remote schemas and routing queries with strict read-only parameters.
- **📊 Dynamic Visual Analytics Suite**: Auto-detects the optimal visualization for your data:
  - **KPI Metric Cards**: For single aggregated stats.
  - **Bar Charts**: For categorical comparisons.
  - **Line & Area Charts**: For time-series and volume trends.
  - **Donut / Pie Charts**: For proportional distributions.
  - **Interactive Data Table**: Searchable, paginated, and sortable table views.
- **💻 Interactive SQL Workbench**: Inspect, edit, and re-run generated SQL queries directly from an integrated monospace editor with millisecond latency telemetry.
- **🧠 AI Executive Takeaways**: Synthesizes 1–2 sentence business summaries highlighting key trends, anomalies, and findings.
- **🗺️ Database Schema Explorer**: Visual in-app inspector displaying all available tables, column definitions, and data types.
- **📜 Query History Drawer**: Session-persistent query logs with execution duration, row counts, and one-click re-run.
- **📤 Instant Export Suite**: Export result sets as clean CSV or structured JSON files with a single click.

---

## 🏗️ System Architecture

```mermaid
graph TD
    User([Business User / Analyst]) -->|Natural Language Prompt| UI[React 19 Dashboard]
    UI -->|JWT Authenticated POST| API[Django REST API /api/ask/]
    
    subgraph Backend Core
        API --> Inspector[Dynamic Schema Introspector]
        Inspector --> PromptEngine[Dialect-Aware Prompt Builder]
        PromptEngine --> Gemini[Google Gemini GenAI SDK]
        
        Gemini -->|Raw SQL| Sandbox[AST Security Sandbox]
        Sandbox -->|Validated SELECT| DB[(Active Database: SQLite / PostgreSQL)]
        
        DB -- Runtime Error --> SelfHeal[Self-Healing Loop: Auto-Fix via Error Trace]
        SelfHeal --> Gemini
        
        DB -- Execution Results --> Insights[Executive Insight & Chart Synthesizer]
    end
    
    Insights --> UI
    UI --> Visuals[Bar / Line / Area / Donut / KPI / Table]
    UI --> Workbench[Interactive SQL Editor]
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.12+** (tested on 3.12 and 3.14)
- **Node.js 18+** & `npm`
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone the Repository
```bash
git clone https://github.com/Manvendrasingh2005/DataWhisper-enterprise.git
cd DataWhisper-enterprise
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and insert your GEMINI_API_KEY and SECRET_KEY

# Run database migrations
python manage.py migrate

# Seed rich enterprise demo database
python manage.py seed_db

# Create an admin user for dashboard access
python manage.py createsuperuser

# Start Django development server
python manage.py runserver
```

### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit **`http://localhost:5173`** in your browser, log in with your superuser credentials, and start exploring your data!

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key from Google AI Studio (**Required**) | `AQ.Ab8RN6...` |
| `SECRET_KEY` | Django Secret Key | `django-insecure-your-secret-key` |
| `DATABASE_URL` | Optional PostgreSQL URI (defaults to SQLite) | `sqlite:///db.sqlite3` |
| `RENDER` | Set in production to disable DEBUG mode | *(empty in local dev)* |

### Frontend (`frontend/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend REST API Base URL | `http://127.0.0.1:8000` |

---

## 🧪 Testing

The repository includes a comprehensive 11-test suite covering security AST parsing, table whitelisting, schema introspection, and authenticated endpoints:

```bash
cd backend
python manage.py test api
```

Run frontend linting:
```bash
cd frontend
npm run lint
```

---

## 📦 Deployment

DataWhisper includes zero-config deployment configurations:
- **Render**: Connect the repository to Render; it automatically reads [`render.yaml`](render.yaml) to provision a managed PostgreSQL database, Python backend service, and static React frontend.
- **Docker**: Build and run with the provided [`Dockerfile`](backend/Dockerfile) and [`docker-compose.yml`](docker-compose.yml).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
