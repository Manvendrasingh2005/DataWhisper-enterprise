# DataWhisper Enterprise Database Schema Dictionary 🗄️

This document describes the enterprise retail & ERP database schema powering **DataWhisper**. It details entity relationships, column types, constraints, and semantic mappings used by the Natural Language to SQL AI engine.

---

## 🗺️ Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    Supplier ||--o{ Product : supplies
    Product ||--o{ OrderItem : included_in
    Product ||--o{ InventoryLog : tracks
    User ||--o{ Order : places
    Order ||--|{ OrderItem : contains
    Order ||--|| Payment : settled_by

    Supplier {
        bigint id PK
        varchar(150) name
        varchar(254) contact_email
        varchar(100) country
    }

    User {
        bigint id PK
        varchar(100) name
        varchar(254) email UK
        varchar(50) city
        datetime account_created
        varchar(20) status
    }

    Product {
        bigint id PK
        varchar(150) title
        varchar(50) category
        varchar(50) sku UK
        decimal(10,2) cost_price
        decimal(10,2) selling_price
        integer stock_count
        bigint supplier_id FK
    }

    Order {
        bigint id PK
        bigint user_id FK
        datetime order_date
        decimal(10,2) total_amount
        varchar(20) status
    }

    OrderItem {
        bigint id PK
        bigint order_id FK
        bigint product_id FK
        integer quantity
        decimal(10,2) price_per_unit
    }

    Payment {
        bigint id PK
        bigint order_id FK,UK
        varchar(50) payment_method
        varchar(100) transaction_id UK
        varchar(20) gateway_response
        datetime processed_at
    }

    InventoryLog {
        bigint id PK
        bigint product_id FK
        varchar(10) movement_type
        integer quantity
        datetime logged_at
    }
```

---

## 📋 Data Dictionary & Table Specifications

### 1. `api_supplier` (Vendors & Suppliers)
Stores global wholesale manufacturers and component vendors supplying warehouse inventory.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | NO | Primary Key (auto-incrementing) |
| `name` | `VARCHAR(150)` | NO | Supplier corporate identity (e.g., *Taiwan Semiconductor Corp*) |
| `contact_email` | `VARCHAR(254)` | NO | Corporate procurement email |
| `country` | `VARCHAR(100)` | NO | Origin country (*Taiwan*, *Sweden*, *India*, *USA*) |

---

### 2. `api_user` (Corporate Clients & Customers)
Stores registered B2B clients, accounts, and individual enterprise buyers.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | NO | Primary Key (auto-incrementing) |
| `name` | `VARCHAR(100)` | NO | Client or company representative name |
| `email` | `VARCHAR(254)` | NO | Unique contact and login identifier |
| `city` | `VARCHAR(50)` | NO | Operational headquarters (*San Francisco*, *Bengaluru*, *London*) |
| `account_created`| `DATETIME` | NO | Timestamp of account registration |
| `status` | `VARCHAR(20)` | NO | Account state (`active`, `pending`, `suspended`) |

---

### 3. `api_product` (Product Catalog)
Inventory catalog tracking SKUs, pricing structures, margin profiles, and current inventory stock.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | NO | Primary Key (auto-incrementing) |
| `title` | `VARCHAR(150)` | NO | Product marketing title |
| `category` | `VARCHAR(50)` | NO | Product category (*Electronics*, *Apparel*, *Home & Kitchen*, *Software*) |
| `sku` | `VARCHAR(50)` | NO | Unique stock-keeping barcode/unit identifier |
| `cost_price` | `DECIMAL(10,2)`| NO | Wholesale acquisition unit cost |
| `selling_price`| `DECIMAL(10,2)`| NO | Retail list selling price |
| `stock_count` | `INTEGER` | NO | Current units available in warehouse |
| `supplier_id` | `BIGINT` | YES | Foreign Key referencing `api_supplier(id)` |

---

### 4. `api_order` (Customer Purchases)
Sales transactions tracking total order revenue, timestamps, customer references, and fulfillment statuses.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | NO | Primary Key (auto-incrementing) |
| `user_id` | `BIGINT` | NO | Foreign Key referencing `api_user(id)` |
| `order_date` | `DATETIME` | NO | Order placement timestamp |
| `total_amount` | `DECIMAL(10,2)`| NO | Gross order value in USD |
| `status` | `VARCHAR(20)` | NO | Order status (`completed`, `cancelled`, `processing`) |

---

### 5. `api_orderitem` (Line-Item Breakdown)
Individual line items inside an order linking products, unit quantities, and billed prices.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | NO | Primary Key (auto-incrementing) |
| `order_id` | `BIGINT` | NO | Foreign Key referencing `api_order(id)` |
| `product_id` | `BIGINT` | NO | Foreign Key referencing `api_product(id)` |
| `quantity` | `INTEGER` | NO | Number of units purchased |
| `price_per_unit`| `DECIMAL(10,2)`| NO | Price billed per unit at time of checkout |

---

### 6. `api_payment` (Settlement Gateway)
Payment gateway reconciliation records, methods, and authorization responses.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | NO | Primary Key (auto-incrementing) |
| `order_id` | `BIGINT` | NO | Unique Foreign Key referencing `api_order(id)` |
| `payment_method` | `VARCHAR(50)` | NO | Payment channel (`Credit Card`, `UPI`, `Net Banking`, `Wire`) |
| `transaction_id`| `VARCHAR(100)` | NO | Unique payment gateway transaction reference |
| `gateway_response`| `VARCHAR(20)` | NO | Processor outcome (`SUCCESS`, `FAILED`, `PENDING`) |
| `processed_at` | `DATETIME` | NO | Timestamp payment was cleared |

---

### 7. `api_inventorylog` (Warehouse Stock Movements)
Stock movement audit trails recording intake, depletion, shrinkage, and adjustments.

| Column | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `BIGINT` | NO | Primary Key (auto-incrementing) |
| `product_id` | `BIGINT` | NO | Foreign Key referencing `api_product(id)` |
| `movement_type`| `VARCHAR(10)` | NO | Movement code (`RESTOCK`, `SALE`, `RETURN`, `ADJUST`) |
| `quantity` | `INTEGER` | NO | Absolute quantity moved |
| `logged_at` | `DATETIME` | NO | Audit timestamp |

---

## 🔗 Common Analytical JOIN Patterns

- **Product Sales Volume**:
  ```sql
  SELECT p.title, SUM(oi.quantity) AS total_sold
  FROM api_product p
  JOIN api_orderitem oi ON p.id = oi.product_id
  JOIN api_order o ON oi.order_id = o.id
  WHERE LOWER(o.status) = 'completed'
  GROUP BY p.id, p.title
  ORDER BY total_sold DESC;
  ```

- **Gross Margin by Product Category**:
  ```sql
  SELECT p.category, 
         SUM((oi.price_per_unit - p.cost_price) * oi.quantity) AS total_profit,
         ROUND(SUM((oi.price_per_unit - p.cost_price) * oi.quantity) / SUM(oi.price_per_unit * oi.quantity) * 100, 2) AS profit_margin_pct
  FROM api_product p
  JOIN api_orderitem oi ON p.id = oi.product_id
  JOIN api_order o ON oi.order_id = o.id
  WHERE LOWER(o.status) = 'completed'
  GROUP BY p.category;
  ```

- **Payment Gateway Failure Rate**:
  ```sql
  SELECT payment_method,
         COUNT(*) AS total_transactions,
         SUM(CASE WHEN UPPER(gateway_response) = 'FAILED' THEN 1 ELSE 0 END) AS failed_transactions,
         ROUND(100.0 * SUM(CASE WHEN UPPER(gateway_response) = 'FAILED' THEN 1 ELSE 0 END) / COUNT(*), 2) AS failure_rate_pct
  FROM api_payment
  GROUP BY payment_method;
  ```
