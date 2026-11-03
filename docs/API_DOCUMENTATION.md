# DataWhisper Enterprise: API Reference Specification

All endpoints under `/api/` require **JWT Bearer Authentication** (except authentication endpoints `/api/token/`). Include the following header with each request:

```http
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

---

## 1. Authentication Endpoints

### 1.1 Obtain JWT Token
- **Endpoint**: `POST /api/token/`
- **Description**: Authenticates user credentials and returns JWT access and refresh tokens.

#### Request Body
```json
{
  "username": "admin",
  "password": "your_secure_password"
}
```

#### Success Response (`200 OK`)
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.2 Refresh JWT Token
- **Endpoint**: `POST /api/token/refresh/`
- **Description**: Issues a fresh access token using a valid refresh token.

#### Request Body
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Success Response (`200 OK`)
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 2. Natural Language Query Endpoint

### 2.1 Ask AI (Natural Language Query Pipeline)
- **Endpoint**: `POST /api/ask/`
- **Description**: Converts a natural language question into dialect-specific SQL, verifies AST security constraints, executes the query, triggers self-healing on errors, and computes instant analytical insights and visualization recommendations.
- **Latency SLA**: ~1.0s end-to-end via speculative hedged execution (`gemini-3.1-flash-lite` ⚔️ `gemini-3.5-flash`).

#### Request Headers
```http
Authorization: Bearer <your_access_token>
Content-Type: application/json
```

#### Request Body
```json
{
  "question": "What is the total revenue of all completed orders?",
  "history": [
    {
      "question": "How many orders were placed this month?",
      "sql": "SELECT count(*) FROM api_order"
    }
  ],
  "db_uri": "postgresql://user:pass@host:5432/dbname"
}
```
*Note: `history` and `db_uri` are optional.*

#### cURL Example
```bash
curl -X POST http://127.0.0.1:8000/api/ask/ \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "Show top 5 highest selling products"}'
```

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "question": "Show top 5 highest selling products",
  "sql": "SELECT p.title, SUM(oi.quantity) AS total_sold FROM api_product p JOIN api_orderitem oi ON p.id = oi.product_id GROUP BY p.id ORDER BY total_sold DESC LIMIT 5",
  "columns": ["title", "total_sold"],
  "rows": [
    { "title": "27-inch IPS 144Hz Monitor", "total_sold": 48 },
    { "title": "4K Ultra HD OLED TV", "total_sold": 45 },
    { "title": "Wireless Mechanical Keyboard", "total_sold": 35 }
  ],
  "row_count": 3,
  "insight": "27-inch IPS 144Hz Monitor leads total sold with 48 units (37.5% share across top results).",
  "suggested_chart": "pie_chart",
  "execution_time_ms": 1010.23,
  "healed": false,
  "model": "gemini-3.1-flash-lite"
}
```

#### Response Fields:
| Field | Type | Description |
| :--- | :--- | :--- |
| `status` | `string` | `"success"` or `"error"` |
| `question` | `string` | Echo of user's original natural language prompt |
| `sql` | `string` | Synthesized and validated SQL SELECT statement |
| `columns` | `list[string]` | Ordered column names returned by database cursor |
| `rows` | `list[dict]` | Array of key-value row mappings |
| `row_count` | `integer` | Count of returned records |
| `insight` | `string` | High-fidelity executive business takeaway (0.01ms analytical synthesis) |
| `suggested_chart` | `string` | Recommends `metric_card`, `bar_chart`, `line_chart`, `pie_chart`, or `table` |
| `execution_time_ms`| `float` | Full end-to-end server pipeline duration in milliseconds |
| `healed` | `boolean` | `true` if query underwent self-healing retry repair |
| `model` | `string` | Winning AI model identifier from the speculative hedged race |

#### Security Rejection Response (`403 Forbidden`)
Returned when the AST Security Sandbox detects unauthorized tables, multiple statements, or prohibited DDL/DML keywords:
```json
{
  "error": "Query blocked by Security Middleware: Security Violation: Access to system table 'auth_user' is strictly prohibited.",
  "sql": "SELECT * FROM auth_user"
}
```

#### Standard Error Response (`400 Bad Request` / `500 Server Error`)
```json
{
  "error": "Database execution error: no such column: non_existent_column",
  "sql": "SELECT non_existent_column FROM api_order"
}
```

---

## 3. SQL Workbench Runner

### 3.1 Execute Raw SQL
- **Endpoint**: `POST /api/execute-raw/`
- **Description**: Allows developers and analysts to run custom SQL directly against the active or external database with AST security sandboxing.

#### Request Body
```json
{
  "query": "SELECT category, count(*) as total_items FROM api_product GROUP BY category",
  "db_uri": "sqlite:///custom_db.sqlite3"
}
```

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "sql": "SELECT category, count(*) as total_items FROM api_product GROUP BY category",
  "columns": ["category", "total_items"],
  "rows": [
    { "category": "Electronics", "total_items": 10 },
    { "category": "Apparel", "total_items": 10 }
  ],
  "row_count": 2,
  "execution_time_ms": 4.2
}
```

---

## 4. Database Schema & Inspection

### 4.1 Get Database Schema
- **Endpoint**: `GET /api/schema/` or `POST /api/schema/`
- **Description**: Returns all user/application tables, column types, and foreign keys.

#### Request Query / Body (Optional)
```http
GET /api/schema/?db_uri=postgresql://user:pass@host:5432/db
```

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "vendor": "sqlite",
  "tables": {
    "api_product": {
      "name": "api_product",
      "columns": [
        { "name": "id", "type": "INTEGER", "null_ok": false, "foreign_key": null },
        { "name": "title", "type": "varchar(150)", "null_ok": false, "foreign_key": null },
        { "name": "selling_price", "type": "numeric", "null_ok": false, "foreign_key": null },
        { "name": "stock_count", "type": "integer", "null_ok": false, "foreign_key": null },
        { "name": "supplier_id", "type": "integer", "null_ok": true, "foreign_key": "api_supplier.id" }
      ]
    }
  }
}
```

---

## 5. External Database Connectivity

### 5.1 Test Database Connection
- **Endpoint**: `POST /api/test-db/`
- **Description**: Verifies network connectivity and authentication for external PostgreSQL or SQLite databases.

#### Request Body
```json
{
  "db_uri": "postgresql://user:password@host:5432/dbname"
}
```

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "success": true,
  "vendor": "postgresql",
  "table_count": 14,
  "tables": ["customers", "orders", "invoices", "products"]
}
```

#### Error Response (`400 Bad Request`)
```json
{
  "error": "connection to server at 'host' (192.168.1.1), port 5432 failed: Connection refused"
}
```
