# AlgoFlow Documentation

![Version](https://img.shields.io/github/v/tag/algoflow-quant/algoflow)

Web-based quantitative trading platform with automated data pipelines and backtesting infrastructure.

!!! success "Current Status"
    Data pipeline operational - Historical and daily DAGs running in production

## Components

- **[Data Pipeline](data_pipeline/overview.md)** - Airflow-based securities data ingestion from yfinance
- **[API Reference](data_pipeline/components/yfinance_pipeline.md)** - Complete pipeline and client documentation

## Quick Links

- [GitHub Repository](https://github.com/algoflow-quant/algoflow)
- [Historical DAG](data_pipeline/dags/historical.md)
- [Daily DAG](data_pipeline/dags/daily.md)

## Local Development

Test docs locally with hot reload:

```bash
# Create venv and install dependencies
python3 -m venv .venv
source .venv/bin/activate
pip install -r docs/requirements.txt

# Serve at http://127.0.0.1:8000
mkdocs serve

# Build static site
mkdocs build
```
