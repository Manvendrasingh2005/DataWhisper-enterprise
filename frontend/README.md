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

## 🎨 UI Component Hierarchy & Architecture

```text
src/
├── App.jsx                     # Core orchestrator: state management, routing, & layouts
├── main.jsx                    # Application entry point with React 19 root
├── index.css                   # Tailwind CSS v4 styling rules & custom animations
└── components/ (Modular Blocks inside App.jsx)
    ├── AuthOverlay             # JWT login & session validation modal
    ├── HeaderNav               # Brand identity, database status pill, & user actions
    ├── QueryInputSection       # Natural language input, prompt suggestions, & submission
    ├── ExecutiveInsightBanner  # High-priority business takeaway & self-healing badge
    ├── VisualAnalyticsEngine   # Multi-chart switcher & Recharts visualizer
    │   ├── MetricCardView      # Single aggregate value, label, and trend direction
    │   ├── BarChartView        # Categorical distribution with hover tooltips
    │   ├── LineChartView       # Time-series trendlines with Cartesian grids
    │   ├── AreaChartView       # Volume accumulation with gradient fills
    │   ├── PieChartView        # Proportional market share with auto-colored legends
    │   └── InteractiveTable    # Sortable, paginated, responsive data table
    ├── SQLWorkbenchDrawer      # Monospace SQL code viewer, editor, & raw execution
    ├── ExternalDatabaseModal   # Multi-DB connection string tester & switcher
    ├── SchemaExplorerModal     # Interactive catalog of tables, fields, and types
    └── QueryHistoryDrawer      # Persistent timeline of prior questions & execution times
```

---

## 🔄 Client State Management Flow

1. **Authentication State**: Access and refresh tokens are stored in browser memory, automatically injected as `Authorization: Bearer <token>` headers on all API requests.
2. **Active Database State**: When connected to an external PostgreSQL or SQLite database, `activeDbUri` is stored in React state and bundled into `/api/ask/` and `/api/execute-raw/` payloads.
3. **Optimistic Loading & Telemetry**: Query submission immediately activates animated skeleton loaders, updates history with a pending timestamp, and captures total client-side roundtrip latency alongside server-reported pipeline duration.
4. **Export Engine**: Zero-latency client-side file synthesis using native browser `Blob` and `URL.createObjectURL` APIs, supporting CSV (with RFC 4180 escaping) and formatted JSON.

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
