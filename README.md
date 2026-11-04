# ShopFloor Backend API

ShopFloor is a production-oriented RESTful backend system for a discrete manufacturing plant specializing in wooden furniture (wooden chairs, tables, and stools). Built with Node.js and PostgreSQL, the platform orchestrates the complete production lifecycle—from receiving raw materials and managing dynamic Bill of Materials (BOM) formulas to executing multi-stage work orders (`DRAFT` → `RELEASED` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`). The architecture guarantees strict auditability and inventory accuracy by maintaining an append-only stock movement ledger, applying database-level check constraints to prohibit negative inventory or over-reservations, and providing transactional integrity across concurrent manufacturing operations.

---

## 1. Exact Environment Versions

The application has been developed and tested with the following exact software versions:

| Component | Exact Version Tested | Notes |
| :--- | :--- | :--- |
| **Node.js** | `v22.17.0` (LTS) | Minimum requirement: `v20.0.0+` |
| **npm** | `11.4.2` | Minimum requirement: `v10.0.0+` |
| **Database** | PostgreSQL `18.6` | Fully compatible with PostgreSQL `15+` (requires `CHECK` constraints) |
| **Operating System** | Windows 10 Pro (x64, Build `10.0.19045`) | Cross-platform compatible (tested with cross-platform Node scripts) |

---

## 2. Prerequisites & Installation

Before running the application, ensure the following prerequisites are installed on your machine:

### Node.js & npm
- Download and install Node.js (Active LTS) from the [official website](https://nodejs.org/), or manage versions via `nvm`:
  ```bash
  # Verify installation
  node -v   # Expected: v20.x or v22.x
  npm -v    # Expected: 10.x or 11.x
  ```

### PostgreSQL (15+)
- Install a local PostgreSQL instance ([PostgreSQL Downloads](https://www.postgresql.org/download/)) or use a cloud-managed PostgreSQL instance (e.g., Neon, Supabase, or AWS RDS).
- Ensure the database server is running and accessible via a connection URI.
  ```bash
  # Verify local PostgreSQL client
  psql --version   # Expected: PostgreSQL 15+
  ```

### Git
- Ensure Git is installed for version control:
  ```bash
  git --version
  ```

---

## 3. Setup & Execution Steps

Follow these exact steps in order on a clean machine to run and test the project:

### Step 1: Clone the Repository
```bash
git clone https://github.com/<your-username>/shopfloor-backend.git
cd shopfloor-backend
```

### Step 2: Install Dependencies
Install production and development dependencies:
```bash
npm install
```

### Step 3: Create the PostgreSQL Database
If using a local PostgreSQL instance, create an empty database (e.g., `shopfloor`):
```bash
# Using PostgreSQL CLI
psql -U postgres -c "CREATE DATABASE shopfloor;"
```
*(If using cloud PostgreSQL such as Neon, note down your connection string).*

### Step 4: Configure Environment Variables
Copy the template configuration file `.env.example` to `.env`:
```bash
# Linux / macOS
cp .env.example .env

# Windows (Command Prompt)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```
Open `.env` and fill in your connection details:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shopfloor
JWT_SECRET=replace_with_a_secure_random_secret_string
JWT_EXPIRES_IN=1h
```

### Step 5: Run Database Migrations
Execute the automated migration script to create all schema tables, constraints, check expressions, and indexes:
```bash
npm run migrate
```

### Step 6: Seed Initial Data
Seed standard roles, users, suppliers, materials, products, BOMs, and baseline inventory records:
```bash
npm run seed
```

### Step 7: Start the Server
Launch the HTTP server:
```bash
# Production mode
npm start

# Development mode (with live reload)
npm run dev
```
The server will start listening on port `5000` (or the configured `PORT`). You can verify liveness:
```bash
curl http://localhost:5000/health
```

### Step 8: Run the Test Suite
Execute the automated end-to-end and integration test suite:
```bash
npm test
```

---

## 4. Seeded User Logins (Local Testing Only)

The seed script creates three dedicated users covering each role in the Role-Based Access Control (RBAC) hierarchy. All default accounts share the password `Password@123`:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@shopfloor.com` | `Password@123` | Full system access: manage BOMs, receive stock, create/release/start/complete work orders, view all reports |
| **Planner** | `planner@shopfloor.com` | `Password@123` | Material receipts, BOM maintenance, creating/releasing/completing work orders, inventory reports |
| **Operator** | `operator@shopfloor.com` | `Password@123` | Starting released work orders, logging shift production outputs (`good` and `rejected` quantities) |

---

## 5. Standard Error Codes

The API returns a uniform, structured JSON error response across all endpoints:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of what went wrong",
    "details": []
  }
}
```

The system employs a fixed set of standardized error codes:

| Error Code | HTTP Status | Description |
| :--- | :---: | :--- |
| `AUTHENTICATION_REQUIRED` | `401` | Missing or malformed `Authorization: Bearer <JWT>` header |
| `INVALID_TOKEN` | `401` | Token is invalid, forged, or has expired |
| `INACTIVE_USER` | `401` | The authenticated user account has been deactivated (`is_active = false`) |
| `FORBIDDEN` | `403` | User does not possess the requisite role to access this resource |
| `VALIDATION_ERROR` | `400` | Input payload, query parameter, or URL route parameter failed validation |
| `RESOURCE_NOT_FOUND` | `404` | The requested material, supplier, product, or work order was not found |
| `INVALID_STATUS_TRANSITION`| `409` | Prohibited status jump (e.g., `DRAFT` directly to `IN_PROGRESS`, or cancelling an `IN_PROGRESS` order that already has logged production) |
| `INSUFFICIENT_STOCK` | `409` | Insufficient available stock (`on_hand - reserved`) to release the work order; response includes shortage details for each BOM item |
| `EXCEEDS_PLANNED_QUANTITY` | `409` | Total logged production (`good_qty + rejected_qty`) exceeds the work order's planned quantity |
| `CANNOT_COMPLETE_ZERO_GOOD`| `409` | Work order completion attempted without at least one recorded good unit |
| `INTERNAL_SERVER_ERROR` | `500` | Unexpected database exception or unhandled internal error |

---

## 6. What Was Left Out & Next Steps

If allotted additional time, the following enhancements would be prioritized:

1. **Redis Caching & Throttling**:
   - Cache high-frequency analytical queries (`/reports/stock-status`, `/reports/production-summary`) with TTL and invalidation triggers on stock movement.
   - Introduce IP- and user-based rate limiting to prevent brute-force login attempts and denial-of-service spikes.
2. **Comprehensive Idempotency Layer**:
   - Introduce an `Idempotency-Key` header middleware backed by PostgreSQL/Redis for state-mutating requests (`POST /production-logs`, `POST /receipts`) to guarantee safe network retries.
3. **Docker & Local Orchestration**:
   - Provide a multi-stage `Dockerfile` and a `docker-compose.yml` defining an isolated Node application and PostgreSQL container for seamless one-command evaluation.
4. **Structured Tracing & Audit Telemetry**:
   - Integrate OpenTelemetry for distributed tracing and Winston/Pino for structured JSON logging with correlation IDs.
5. **Event-Driven Procurement Alerts**:
   - Implement an event emitter or message queue worker that automatically flags materials that breach their `reorder_level` following stock reservations or consumptions.

---

## 7. Problems Encountered During Setup & Solutions

1. **Missing Unique Constraint on `suppliers(email)`**:
   - *Problem*: Running `npm run seed` originally threw `error: there is no unique or exclusion constraint matching the ON CONFLICT specification` on the `suppliers` table.
   - *Solution*: Identified that while `schema.sql` defined `email VARCHAR(255) UNIQUE`, the pre-existing database table was missing the unique constraint. Applied `ALTER TABLE suppliers ADD CONSTRAINT suppliers_email_key UNIQUE (email);` to ensure safe, idempotent upserts during database seeding.
2. **Column Naming Discrepancy on `products` (`active` vs. `is_active`)**:
   - *Problem*: The physical database schema defined column `active` on the `products` table, whereas application seed scripts and domain models referenced `is_active`.
   - *Solution*: Executed `ALTER TABLE products RENAME COLUMN active TO is_active;` to unify naming conventions across database schema, seeds, and API serializers.
3. **Admin User Password Hash Mismatch**:
   - *Problem*: An existing database record for `admin@shopfloor.com` contained a legacy password hash that failed authentication with `Password@123`.
   - *Solution*: Updated the record using `bcrypt.hash('Password@123', 10)` during environment setup to ensure all seeded logins match the documentation.
4. **Cross-Platform Node ES Module Imports**:
   - *Problem*: Dynamic file imports on Windows environments require explicit `file:///` URI schemes to prevent scheme protocol errors.
   - *Solution*: Adopted standardized relative ES module imports (`import ... from './path.js'`) across all modules, ensuring seamless cross-platform execution on Windows, Linux, and macOS.
