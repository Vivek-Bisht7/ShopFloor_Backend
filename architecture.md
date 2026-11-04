# ShopFloor System Architecture

The complete system architecture documentation is available in [**`docs/architecture.md`**](file:///e:/SHOPFLOOR_BACKEND/docs/architecture.md).

For quick reference, see below:

---

## 1. High-Level Architecture

```mermaid
flowchart TD
    Client["Client / Frontend / Postman"]
    
    subgraph Edge["HTTP & Routing Layer"]
        ReqId["Request ID & Logger"]
        Auth["JWT Authenticate"]
        RBAC["Role Authorization"]
        Val["Schema Validation"]
        Router["Express Routers"]
    end
    
    subgraph Monolith["ShopFloor Monolith"]
        subgraph Controllers["Controller Layer"]
            Ctrl["Extracts Request, Invokes Service, Selects Serializer"]
        end

        subgraph Factories["Factory Layer"]
            AppFactory["App Factory (createApp)"]
            DomainFactory["Work Order Transition Factory"]
        end

        subgraph Services["Service Layer (Business Logic)"]
            AuthSvc["Auth Service"]
            ReceiptSvc["Receipt Service"]
            WOSvc["Work Order Service"]
            ProdSvc["Production Service"]
            ReportSvc["Report Service"]
        end

        subgraph Repositories["Repository Layer (SQL & Data Access)"]
            AuthRepo["Auth Repo"]
            MaterialRepo["Material & Stock Repo"]
            WORepo["Work Order Repo"]
            ProdRepo["Production Repo"]
            ReportRepo["Report SQL Repo"]
        end

        subgraph Serializers["Serializer Layer"]
            Serializer["Strip Secrets, camelCase, ISO Dates, Decimal Formats"]
        end
    end

    subgraph Storage["Storage Layer"]
        DB[("PostgreSQL 15+ (Neon)")]
    end

    Client -->|HTTP / JSON| ReqId
    ReqId --> Auth --> RBAC --> Val --> Router
    Router --> Ctrl
    Ctrl --> DomainFactory
    DomainFactory --> Services
    Ctrl --> Services
    Services --> Repositories
    Repositories -->|Parameterized SQL| DB
    Ctrl --> Serializer
    Serializer -->|Standard Envelope| Client
```

---

## 2. Core Architectural Pillars

- **Strict Layer Separation**: Controller $\to$ Service $\to$ Repository $\to$ Database.
- **Factory Design Patterns**:
  - **App Factory (`createApp(deps)`)**: Decouples Express application assembly from port binding for isolated, ephemeral automated test runs.
  - **Domain Transition Factory (`WorkOrderTransitionFactory`)**: Encapsulates work order lifecycle transitions (`DRAFT`, `RELEASED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) polymorphically behind a unified interface.
- **Transactional Stock Integrity**:
  - Available inventory formula: $\text{available} = \text{on\_hand} - \text{reserved}$.
  - Atomic reservations using pessimistic row-level locks (`SELECT ... FOR UPDATE` ordered by `material_id ASC`).
  - Database check constraints `CHECK (on_hand >= 0 AND reserved >= 0)` and `CHECK (reserved <= on_hand)`.
  - Immutable, append-only `stock_movements` ledger (`RECEIPT`, `RESERVE`, `UNRESERVE`, `CONSUME`).
- **Complete Details**: Please read the full document at [**`docs/architecture.md`**](file:///e:/SHOPFLOOR_BACKEND/docs/architecture.md).
