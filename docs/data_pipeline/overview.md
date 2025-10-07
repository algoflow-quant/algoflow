# Data Pipeline Overview

Apache Airflow 2.10.4 pipeline for securities data ingestion.

## Architecture

```mermaid
graph TB
    A[Airflow DAGs] --> B[YfinancePipeline]
    B --> C[YfinanceClient]
    C --> D[(PostgreSQL + TimescaleDB)]
    
    B --> E[Scraping]
    B --> F[Validation]
    C --> G[Bulk Insert]
```

!!! info "Performance"
    Uses `psycopg2.extras.execute_values` for 10-100x faster bulk inserts

## DAGs

### Historical DAG
Bulk data loading with parallel execution

- **Trigger**: Manual via Airflow UI
- **Parallelism**: 20 concurrent tasks
- **Retries**: 2-3 with exponential backoff

### Daily DAG
Incremental updates for existing securities

- **Schedule**: Weekdays 9:30 PM UTC
- **Parallelism**: 20 concurrent tasks
- **Auto-runs**: After market close

## Configuration

=== "Environment Variable"
    ```bash
    SEC_MASTER_DB_URL="postgresql://user:pass@localhost:5432/sec_master_dev"
    ```

=== "Python"
    ```python
    from utils.database import get_database_url
    client = YfinanceClient(get_database_url())
    ```

## Deployment

!!! tip "Quick Start"
    ```bash
    docker compose -f infrastructure/docker-compose.data-pipeline.yml up -d
    ```

Access Airflow: `http://localhost:8080` (admin/admin)
