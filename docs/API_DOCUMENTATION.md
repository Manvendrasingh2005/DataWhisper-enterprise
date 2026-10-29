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

### 2.1 Ask AI
- **Endpoint**: `POST /api/ask/`
- **Description**: Converts a natural language question into SQL, runs security validation, executes the query, auto-heals any syntax errors, and synthesizes executive insights and visualization recommendations.

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

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "question": "What is the total revenue of all completed orders?",
  "sql": "SELECT SUM(total_amount) FROM api_order WHERE LOWER(status) = 'completed'",
  "columns": ["SUM(total_amount)"],
  "rows": [
    {
      "SUM(total_amount)": 199352.93
    }
  ],
  "row_count": 1,
  "insight": "The total revenue generated from all completed orders stands at $199,352.93.",
  "suggested_chart": "metric_card",
  "execution_time_ms": 142.5,
  "healed": false,
  "model": "gemini-3.5-flash"
}
```

#### Security Rejection Response (`403 Forbidden`)
```json
{
  "error": "Query blocked by Security Middleware: Security Violation: Access to system table 'auth_user' is strictly prohibited.",
  "sql": "SELECT * FROM auth_user"
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
