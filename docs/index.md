# AlgoFlow Documentation

![Version](https://img.shields.io/github/v/tag/algoflow-quant/algoflow)

Web-based quantitative trading platform with automated data pipelines and backtesting infrastructure.

!!! success "Current Status"
    Data pipeline operational - Historical and daily DAGs running in production

## Components

- **[Data Pipeline](data_pipeline/overview.md)** - Airflow-based securities data ingestion from yfinance
- **[YfinanceClient](data_pipeline/components/yfinance_client.md)** - Database operations and connection management
- **[YfinancePipeline](data_pipeline/components/yfinance_pipeline.md)** - Data scraping orchestration
- **[Tickers](data_pipeline/components/yfinance_tickers.md)** - Ticker discovery and registration
- **[Validation](data_pipeline/components/yfinance_validation.md)** - Data quality assurance with Great Expectations

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
