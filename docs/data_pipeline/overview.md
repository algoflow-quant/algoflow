# Data Pipeline Overview

Apache Airflow 2.10.4 pipeline for securities data ingestion.

## Architecture

- **DAGs**: Airflow orchestration (historical + daily)
- **Pipeline**: Data scraping and validation
- **Client**: Database operations
- **Storage**: PostgreSQL + TimescaleDB

## DAGs

- **Historical**: Bulk data loading (manual trigger)
- **Daily**: Incremental updates (weekdays 9:30 PM UTC)

## Configuration

```bash
SEC_MASTER_DB_URL="postgresql://user:pass@localhost:5432/sec_master_dev"
```

## Deployment

```bash
docker compose -f infrastructure/docker-compose.data-pipeline.yml up -d
```

Access Airflow: `http://localhost:8080` (admin/admin)
