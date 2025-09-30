# Native python modules
from typing import List, Dict, Any
from datetime import datetime, date, timedelta
import pandas as pd
import yfinance as yf
from tqdm import tqdm
import requests
import logging

# 3rd party libraries
from loguru import logger

class YfinancePipeline:
    """
    Main data pipeline with date range and incremental scraping
    - Atomic methods (should be bareboned & simple)
    - No retry logic & debug logging only (maybe error log) NO INFO LOGS!
    - Each method should download data for one stock (airflow handles parallel execution)
    """
    
    def __init__(self):
        # Set Loguru logger
        self.logger = logger
        

    def scrape_metadata(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:

        """
        Scrape fundamental metadata for tickers

        Args:
            tickers: List of ticker symbols

        Returns:
            Dictionary mapping ticker to metadata dict
        """
        self.logger.info(f"[METADATA] Starting scrape for {len(tickers)} tickers")

        metadata_dict = {}
        failed_tickers = []

        # Suppress yfinance output
        yf_logger = logging.getLogger('yfinance')
        yf_logger.disabled = True

        # Track field availability stats
        field_counts = {}

        for ticker in tqdm(tickers, desc="Scraping metadata"):
            try:
                self.logger.debug(f"[METADATA] Fetching: {ticker}")
                stock = yf.Ticker(ticker)
                info = stock.info

                # Skip if no data returned
                if not info or 'symbol' not in info:
                    self.logger.warning(f"[METADATA] No data: {ticker}")
                    failed_tickers.append(ticker)
                    continue

                # Calculate derived metrics
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                target_price = info.get('targetMeanPrice')
                target_upside = None
                if target_price and current_price:
                    target_upside = (target_price - current_price) / current_price

                free_cash_flow = info.get('freeCashflow')
                market_cap = info.get('marketCap')
                fcf_yield = None
                if free_cash_flow and market_cap:
                    fcf_yield = free_cash_flow / market_cap

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

                metadata_dict[ticker] = metadata

                # Track which fields have values (for diagnostics)
                for key, value in metadata.items():
                    if key not in ['ticker', 'date_scraped', 'last_updated', 'data_source']:
                        field_counts[key] = field_counts.get(key, 0) + (1 if value is not None else 0)

            except Exception as e:
                self.logger.error(f"[METADATA] Failed {ticker}: {str(e)[:100]}")
                failed_tickers.append(ticker)
                continue

        self.logger.info(f"[METADATA] Complete: {len(metadata_dict)} success | {len(failed_tickers)} failed")
        return metadata_dict
    
    def scrape_date_range(
        self,
        tickers: List[str],
        start_date: date,
        end_date: date,
        interval: str = '1d'
    ) -> Dict[str, pd.DataFrame]:
        """
        Scrape historical data for a specific date range.

        Args:
            tickers: List of ticker symbols
            start_date: Start date
            end_date: End date
            interval: Data interval (1d only)

        Returns:
            Dictionary mapping tickers to their OHLCV DataFrames (empty dict entry for failed tickers)
        """
        data_dict = {}
        failed_tickers = []
        total = len(tickers)
        self.logger.info(f"[OHLCV] Starting: {total} tickers | {start_date} to {end_date}")
        
        # Configure logger to supress yfinance output
        yf_logger = logging.getLogger('yfinance')
        yf_logger.disabled = True
        
        for i, ticker in tqdm(enumerate(tickers, 1), desc="Scraping tickers"):
            try:
                self.logger.debug(f"[OHLCV] Downloading: {ticker}")
                # Download the data for a ticker
                ticker_data = yf.download(
                    ticker,
                    start=start_date,
                    end=end_date,
                    interval=interval,
                    progress=False, # Disable individual progress bars
                    auto_adjust=True, # adjusted close prices (dividends & stock splits)
                )

                # Check if data
                if ticker_data is not None and not ticker_data.empty:
                    # Flatten column names if they are MultiIndex (happens with single ticker)
                    if isinstance(ticker_data.columns, pd.MultiIndex):
                        ticker_data.columns = ticker_data.columns.droplevel(1)

                    self.logger.debug(f"[OHLCV] Success {ticker}: {len(ticker_data)} rows")
                    data_dict[ticker] = ticker_data
                    if i % 100 == 0:
                        self.logger.info(f"[OHLCV] Progress: {i}/{total} done | {len(failed_tickers)} failed")
                else:
                    self.logger.warning(f"[OHLCV] No data: {ticker}")
                    failed_tickers.append(ticker)
            
            except Exception as e:
                self.logger.error(f"[OHLCV] Failed {ticker}: {str(e)[:100]}")
                failed_tickers.append(ticker)
                continue

        self.logger.info(f"[OHLCV] Complete: {len(data_dict)} success | {len(failed_tickers)} failed")
        if failed_tickers and len(failed_tickers) <= 10:
            self.logger.warning(f"[OHLCV] Failed list: {failed_tickers}")

        return data_dict
    
    def _scrape_sp500_tickers(self) -> List[str]:
        """Scrapes S&P 500 tickers from Wikipedia"""
        self.logger.info("[SCRAPER] Fetching S&P 500 tickers from Wikipedia")
        sp500_url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"

        # Add headers to avoid 403 error
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        # Fetch the HTML with headers
        self.logger.debug(f"[SCRAPER] GET {sp500_url}")
        response = requests.get(sp500_url, headers=headers)
        self.logger.debug(f"Response status: {response.status_code}")

        # Read the table from the HTML
        tables = pd.read_html(response.text)
        df = tables[0]

        # Extract tickers from Symbol column
        tickers = df['Symbol'].tolist()

        # Clean tickers (replace dots with dashes for BRK.B -> BRK-B)
        tickers = [ticker.replace('.', '-') for ticker in tickers]
        self.logger.info(f"[SCRAPER] S&P 500: {len(tickers)} tickers found")
        return tickers
    
    def _scrape_russell3000_tickers(self) -> List[str]:
        """Scrapes Russell 3000 tickers from iShares IWV ETF holdings"""
        self.logger.info("[SCRAPER] Fetching Russell 3000 tickers from iShares IWV ETF")

        # IWV is the iShares Russell 3000 ETF - direct CSV download URL
        csv_url = "https://www.ishares.com/us/products/239714/ishares-russell-3000-etf/1467271812596.ajax?fileType=csv&fileName=IWV_holdings&dataType=fund"

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        response = requests.get(csv_url, headers=headers)

        if response.status_code != 200:
            raise ValueError(f"Failed to download Russell 3000 data from iShares: Status {response.status_code}")

        # Parse CSV - iShares CSV has metadata in first ~10 rows
        from io import StringIO
        lines = response.text.split('\n')

        # Find where the actual data starts (look for "Ticker" header)
        data_start = 0
        for i, line in enumerate(lines):
            if 'Ticker' in line:
                data_start = i
                break

        if data_start == 0:
            raise ValueError("Could not find ticker data in iShares CSV")

        # Parse the CSV starting from the data rows
        csv_data = '\n'.join(lines[data_start:])
        df = pd.read_csv(StringIO(csv_data))

        # Extract tickers from the Ticker column
        tickers = df['Ticker'].dropna().tolist()

        # Clean tickers - remove cash positions and invalid entries
        tickers = [str(ticker).strip() for ticker in tickers
                 if ticker and str(ticker).strip()
                 and not str(ticker).startswith('CASH')
                 and not str(ticker).startswith('USD')
                 and len(str(ticker).strip()) <= 5]  # Most tickers are 1-5 chars

        self.logger.info(f"[SCRAPER] Russell 3000: {len(tickers)} tickers found")
        return tickers
    
    def _scrape_nasdaq_tickers(self) -> List[str]:
        """Scrapes tickers from nasdaq"""
        self.logger.info("[SCRAPER] Fetching NASDAQ tickers")
        nasdaq_url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"

        self.logger.debug(f"[SCRAPER] GET {nasdaq_url}")
        # Read the nasdaq url file with | as the separator
        df = pd.read_csv(nasdaq_url, sep='|')
        
        # Remove nan values from the data
        df = df.dropna(subset=['Symbol']) 
        
        # Extract the Symbol column to a list & remove test symbol
        tickers = df[df['Test Issue'] == 'N']['Symbol'].tolist()

        self.logger.info(f"[SCRAPER] NASDAQ: {len(tickers)} tickers found")
        # Return ticker list
        return tickers
    
    def validate_tickers(self, tickers: List[str], test_days: int = 21) -> Dict[str, Any]:
        """
        Validate tickers by attempting to download recent data

        Args:
            tickers: List of tickers to validate
            test_days: Number of calendar days of data to test (default 21 days ~ 15 trading days)

        Returns:
            Dict with 'valid' and 'invalid' ticker lists
        """
        valid_tickers = []
        invalid_tickers = []
        
        # Configure logger to supress yfinance output
        yf_logger = logging.getLogger('yfinance')
        yf_logger.disabled = True

        # Calculate date range
        end_date = date.today()
        start_date = end_date - timedelta(days=test_days)

        self.logger.info(f"[VALIDATE] Starting: {len(tickers)} tickers")

        # Process one ticker at a time with clean progress bar
        for ticker in tqdm(tickers, desc="Validating tickers", ncols=100, leave=True):
            try:
                self.logger.debug(f"[VALIDATE] Checking: {ticker}")

                # Download single ticker with explicit auto_adjust
                data = yf.download(
                    tickers=ticker,
                    start=start_date,
                    end=end_date,
                    progress=False,
                    threads=False,
                    auto_adjust=True  # Explicitly set to avoid warning
                )

                # Check if we got valid data with minimum trading days
                # For 21 calendar days, we expect at least 10 trading days (accounting for weekends/holidays)
                min_trading_days = 10  # Minimum required trading days to be considered valid

                if data is not None and not data.empty and len(data) >= min_trading_days:
                    self.logger.debug(f"[VALIDATE] ✓ {ticker}: {len(data)} trading days")
                    valid_tickers.append(ticker)
                else:
                    days_found = len(data) if data is not None and not data.empty else 0
                    self.logger.debug(f"[VALIDATE] ✗ {ticker}: only {days_found}/{min_trading_days} trading days")
                    invalid_tickers.append(ticker)

            except Exception as e:
                self.logger.debug(f"[VALIDATE] ✗ {ticker}: {str(e)[:50]}")
                invalid_tickers.append(ticker)

        self.logger.info(f"[VALIDATE] Complete: {len(valid_tickers)} valid | {len(invalid_tickers)} invalid")

        return {
            'valid': valid_tickers,
            'invalid': invalid_tickers,
            'total': len(tickers),
            'success_rate': len(valid_tickers) / len(tickers) if tickers else 0
        }