# Native python modules
from typing import Dict, Any
from datetime import datetime, date
import pandas as pd
import yfinance as yf
import logging
import time
import pandas_market_calendars as mcal

# Custom utils
from utils.observability import tracer, meter, Status, StatusCode

# Suppress yfinance output
yf_logger = logging.getLogger('yfinance')
yf_logger.disabled = True

class YfinancePipeline:
    """
    Core yfinance data scraping pipeline
    - Metadata scraping (company fundamentals)
    - OHLCV scraping (price/volume data)
    """

    def __init__(self) -> None:

        # Setup python logger
        self.logger = logging.getLogger(__name__)

        # Metrics: metadata scrape counter
        self.metadata_scrape_counter = meter.create_counter(
            name="yfinance_metadata_scrapes_total",
            description="Total metadata scrape attempts",
            unit="1"
        )

        # Metrics: metadata scrape duration histogram
        self.metadata_scrape_duration = meter.create_histogram(
            name="yfinance_metadata_scrape_duration_seconds",
            description="Metadata scrape operation duration",
            unit="s"
        )

        # Metrics: metadata null fields histogram (stocks with 0 nulls still get added to hist)
        self.metadata_null_fields_histogram = meter.create_histogram(
            name="yfinance_metadata_null_fields",
            description="Null fields per metadata scrape",
            unit="1"
        )

        # Metrics: ohlcv scrape counter
        self.ohlcv_scrape_counter = meter.create_counter(
            name="yfinance_ohlcv_scrapes_total",
            description="Total OHLCV scrape attempts",
            unit="1"
        )

        # Metrics: ohlcv scrape duration histogram
        self.ohlcv_scrape_duration_histogram = meter.create_histogram(
            name="yfinance_ohlcv_scrape_duration_seconds",
            description="OHLCV scrape duration",
            unit="s"
        )

        # Metrics: ohlcv rows returned histogram
        self.ohlcv_rows_histogram = meter.create_histogram(
            name="yfinance_ohlcv_rows_returned",
            description="Number of OHLCV rows per scrape",
            unit="1"
        )

        # Metrics: ohlcv date range requested histogram
        self.ohlcv_date_range_histogram = meter.create_histogram(
            name="yfinance_ohlcv_date_range_days",
            description="Date range requested in days",
            unit="1"
        )

    def scrape_metadata(self, ticker: str) -> Dict[str, Any]:
        """
        Scrape fundamental metadata for a single ticker

        Args:
            ticker: A string for the ticker

        Returns:
            A dictionary with metadata about the ticker
        """

        # Get current time to track total time taken per metadata scrape
        start_time = time.time()

        # Start a span for scrape metdata
        with tracer.start_as_current_span("scrape_metadata") as span:

            # We need try logic to close out the OTEL stuff
            try:

                # Add ticker & data source as an attribute
                span.set_attribute("ticker", ticker)
                span.set_attribute("data_source", "yfinance")

                self.logger.debug(f"Starting metadata scrape for ticker: {ticker}") # Mainly for searching (LOKI)

                # Get the metadata from yfinance
                stock = yf.Ticker(ticker)
                info = stock.info

                if info is None or not info:
                    raise ValueError(f"Metadata for {ticker} returned None")

                # Calculate derived metrics
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                target_price = info.get('targetMeanPrice')
                target_upside = None

                # Calculate target upside
                if target_price and current_price:
                    target_upside = (target_price - current_price) / current_price

                # Calculate free cash flow and fcf_yield
                free_cash_flow = info.get('freeCashflow')
                market_cap = info.get('marketCap')
                fcf_yield = None
                if free_cash_flow and market_cap:
                    fcf_yield = free_cash_flow / market_cap

                # Create event for metrics
                span.add_event("derived_metrics_calculated", {
                    "target_upside": target_upside,
                    "fcf_yield": fcf_yield
                }) #type: ignore

                self.logger.debug(f"Metric target_upside: {target_upside} & fcf_yield: {fcf_yield} calculated")

                # Extract only high and medium availability fields (>50%)
                metadata = {
                    'ticker': ticker,
                    'date_scraped': date.today(),

                    # Company Basic Info (80%+ availability)
                    'company_name': info.get('longName'),
                    'exchange': info.get('exchange'),
                    'country': info.get('country'),
                    'sector': info.get('sector'),
                    'industry': info.get('industry'),
                    'market_cap': market_cap,
                    'enterprise_value': info.get('enterpriseValue'),
                    'shares_outstanding': info.get('sharesOutstanding'),
                    'float_shares': info.get('floatShares'),

                    # Valuation Metrics (50%+ availability)
                    'price_to_book': info.get('priceToBook'),
                    'forward_pe': info.get('forwardPE'),
                    'ev_to_ebitda': info.get('enterpriseToEbitda'),
                    'ev_to_revenue': info.get('enterpriseToRevenue'),
                    'price_to_sales': info.get('priceToSalesTrailing12Months'),

                    # Profitability & Quality (75%+ availability)
                    'gross_margin': info.get('grossMargins'),
                    'operating_margin': info.get('operatingMargins'),
                    'profit_margin': info.get('profitMargins'),
                    'return_on_equity': info.get('returnOnEquity'),
                    'return_on_assets': info.get('returnOnAssets'),
                    'free_cash_flow_yield': fcf_yield,

                    # Growth Metrics (60%+ availability)
                    'revenue_growth_yoy': info.get('revenueGrowth'),
                    'revenue_per_share': info.get('revenuePerShare'),

                    # Financial Health (67%+ availability)
                    'debt_to_equity': info.get('debtToEquity'),
                    'current_ratio': info.get('currentRatio'),
                    'quick_ratio': info.get('quickRatio'),
                    'total_cash': info.get('totalCash'),
                    'total_debt': info.get('totalDebt'),
                    'total_cash_per_share': info.get('totalCashPerShare'),
                    'book_value': info.get('bookValue'),

                    # Cash Flow (77%+ availability)
                    'operating_cash_flow': info.get('operatingCashflow'),
                    'free_cash_flow': free_cash_flow,

                    # Dividends (81%+ availability)
                    'payout_ratio': info.get('payoutRatio'),

                    # Short Interest & Ownership (80%+ availability)
                    'short_percent_of_float': info.get('shortPercentOfFloat'),
                    'short_ratio': info.get('shortRatio'),
                    'shares_short': info.get('sharesShort'),
                    'shares_percent_shares_out': info.get('sharesPercentSharesOut'),
                    'held_percent_institutions': info.get('heldPercentInstitutions'),
                    'held_percent_insiders': info.get('heldPercentInsiders'),

                    # Analyst Coverage (61%+ availability)
                    'target_mean_price': target_price,
                    'target_price_upside': target_upside,
                    'number_of_analysts': info.get('numberOfAnalystOpinions'),
                    'recommendation_key': info.get('recommendationKey'),

                    # Market Performance (80%+ availability)
                    'beta': info.get('beta'),
                    '52_week_high': info.get('fiftyTwoWeekHigh'),
                    '52_week_low': info.get('fiftyTwoWeekLow'),
                    '52_week_change': info.get('52WeekChange'),
                    'sp500_52_week_change': info.get('SandP52WeekChange'),
                    '50_day_average': info.get('fiftyDayAverage'),
                    '200_day_average': info.get('twoHundredDayAverage'),

                    # Trading Volume (100% availability)
                    'average_volume': info.get('averageVolume'),
                    'average_volume_10days': info.get('averageDailyVolume10Day'),
                    'regular_market_volume': info.get('regularMarketVolume'),

                    # Metadata
                    'last_updated': datetime.now(),
                    'data_source': 'yfinance'
                }

                # Calculate time taken
                duration = time.time() - start_time

                # Get various counts related to null values
                null_count = list(metadata.values()).count(None)
                fields_total = len(metadata)
                fields_populated = fields_total - null_count

                # Extra span attributes
                span.set_attribute("fields_total", fields_total)
                span.set_attribute("fields_populated", fields_populated)
                span.set_attribute("fields_missing", null_count)
                span.set_attribute("scrape_success", True)

                # Span event (Marks a large step within a span)
                span.add_event("metadata_extraction_complete", {
                    "null_count": null_count,
                    "fields_populated": fields_populated,
                })

                # Record metrics
                self.metadata_scrape_counter.add(1, {"status": "success"})
                self.metadata_scrape_duration.record(duration)
                self.metadata_null_fields_histogram.record(null_count)

                # Info logging (mainly for large scale searching)
                self.logger.debug(f"Sucessfully downloaded ticker: {ticker} with {null_count}/{fields_total} null values")

                # Return metadata
                return metadata

            except Exception as e:

                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("scrape_success", False)

                # Record failure metric
                duration = time.time() - start_time
                self.metadata_scrape_counter.add(1, {"status": "failure"})
                self.metadata_scrape_duration.record(duration)

                # Keep error log
                self.logger.error(f"Failed to scrape {ticker}: {e}")
                raise

    def scrape_date_range(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        interval: str = '1d'
    ) -> pd.DataFrame:
        """
        Scrape historical data for a specific date range for a single ticker

        Args:
            ticker: A single ticker symbol
            start_date: Start date
            end_date: End date
            interval: Data interval (1d only)

        Returns:
            Returns a dataframe containing the ohlcv for a single stock
        """
        # Make start time for download calculation
        start_time = time.time()

        # Try downloading and if fail, report to otel and raise to airflow
        with tracer.start_as_current_span("scrape_ohlcv") as span:
            try:

                # debug log
                self.logger.debug(f"Starting ohlcv download for ticker: {ticker} from {str(start_date)} to {str(end_date)}, interval: {interval}")

                # Set known attributes immediately
                span.set_attribute("ticker", ticker)
                span.set_attribute("data_source", "yfinance")
                span.set_attribute("start_date", str(start_date))
                span.set_attribute("end_date", str(end_date))
                span.set_attribute("interval", interval)

                # Get NYSE calendar
                nyse = mcal.get_calendar('NYSE')

                # Calculate actual trading days
                schedule = nyse.schedule(start_date=start_date, end_date=end_date)
                trading_days = len(schedule)

                # Set calendar and trading days attributes
                span.set_attribute("date_range_trading_days", trading_days)
                span.set_attribute("date_range_calendar_days", (end_date - start_date).days)

                # Download the data for a ticker
                ticker_data = yf.download(
                    ticker,
                    start=start_date,
                    end=end_date,
                    interval=interval,
                    progress=False, # Disable individual progress bars
                    auto_adjust=True, # Adjusted close prices (dividends & stock splits)
                )

                # Check for no data returned
                if ticker_data is None:
                    raise ValueError("OHLCV data is None")

                # Record time taken
                duration = time.time() - start_time

                # Add span event
                span.add_event("ohlcv_download_complete", {
                    "row_downloaded": len(ticker_data),
                    "trading_days": trading_days
                })

                # Flatten MultiIndex columns (yfinance returns MultiIndex for single ticker)
                if isinstance(ticker_data.columns, pd.MultiIndex):
                    ticker_data.columns = ticker_data.columns.get_level_values(0)
                    span.add_event("multiindex_flattened")

                # Record success metrics
                self.ohlcv_scrape_counter.add(1, {"status": "success", "interval": interval})
                self.ohlcv_scrape_duration_histogram.record(duration)
                self.ohlcv_rows_histogram.record(len(ticker_data))
                self.ohlcv_date_range_histogram.record(trading_days)

                # Set the rest of attributes
                span.set_attribute("rows_returned", len(ticker_data))
                span.set_attribute("scrape_success", True)

                # log success
                self.logger.debug(f"Successfully downloaded {len(ticker_data)} days out of {trading_days} trading days calculated for the time period")

                # Return ohlcv dataframe
                return ticker_data

            # Catche errors to log/return to airflow
            except Exception as e:

                # Record error on span
                span.record_exception(e)
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.set_attribute("scrape_success", False)

                # Record failure metric
                duration = time.time() - start_time
                self.ohlcv_scrape_counter.add(1, {"status": "failure", "interval": interval})
                self.ohlcv_scrape_duration_histogram.record(duration)

                # Keep error log
                self.logger.error(f"Failed to scrape {ticker}: {e}")
                raise
