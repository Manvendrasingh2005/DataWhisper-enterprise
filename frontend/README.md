# DataWhisper Frontend Client 💻

The frontend client for **DataWhisper Enterprise** is a high-performance single-page analytics application built with **React 19**, **Vite 8**, **Tailwind CSS v4**, and **Recharts**.

---

## 🌟 Key Features

- **Conversational Query Bar**: Real-time natural language query dispatch with loading indicators and categorized business query suggestion pills.
- **Dynamic Multi-Chart Suite**: Automatically renders the best visual chart (KPI Metric Card, Bar Chart, Line Chart, Area Chart, Donut / Pie Chart, or Interactive Table), with a **View As Switcher** allowing manual toggles anytime.
- **Interactive SQL Workbench**: Collapsible monospace SQL editor allowing live query modification, query execution duration telemetry (`⚡ X ms`), and row counters.
- **AI Executive Takeaways**: Top insight banner highlighting key business takeaways and auto-healed indicators.
- **Multi-Database Switcher**: Connect to external PostgreSQL or SQLite databases with live connectivity ping and schema introspection.
- **Schema Explorer**: Modal displaying active database tables, column names, and data types.
- **Query History Drawer**: Session-persistent query drawer tracking duration, row counts, and one-click replay.
- **Instant Data Export**: One-click client-side CSV and JSON downloads.

---

## 🛠️ Setup & Running

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env` using `.env.example`:
```ini
VITE_API_URL=http://127.0.0.1:8000
```

### 3. Start Development Server
```bash
npm run dev
```
The frontend will start at `http://localhost:5173`.

---

## 📦 Build & Linting

### Build for Production:
```bash
npm run build
```
Generates an optimized client bundle in `./dist`.

### Run Linter:
```bash
npm run lint
```
Uses `oxlint` for high-speed static code verification.
