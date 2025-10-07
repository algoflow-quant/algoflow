# type: ignore

# Native python modules
from typing import Dict, Any
from datetime import datetime, date
import pandas as pd
import yfinance as yf
import logging

# Suppress yfinance output
yf_logger = logging.getLogger('yfinance')
yf_logger.disabled = True

class YfinancePipeline:
    """
    Main data pipeline for OHLCV and metadata scraping
    - Atomic methods (should be bareboned & simple)
    - No retry logic & debug logging only (maybe error log) NO INFO LOGS!
    - Each method should download data for one stock (airflow handles parallel execution)
    """

    def scrape_date_range(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        interval: str = '1d'
    ) -> pd.DataFrame | None:
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
      
        # Download the data for a ticker
        ticker_data = yf.download(
            ticker,
            start=start_date,
            end=end_date,
            interval=interval,
            progress=False, # Disable individual progress bars
            auto_adjust=True, # Adjusted close prices (dividends & stock splits)
        )

        if ticker_data is None:
            raise ValueError("OHLCV data is None")

        # Flatten MultiIndex columns (yfinance returns MultiIndex for single ticker)
        if isinstance(ticker_data.columns, pd.MultiIndex):
            ticker_data.columns = ticker_data.columns.get_level_values(0)

        return ticker_data

    def scrape_metadata(self, ticker: str) -> Dict[str, Any]:
        """
        Scrape fundamental metadata for a single ticker

        Args:
            ticker: A string for the ticker

        Returns:
            A dictionary with metadata about the ticker
        """

        # Get the metadata from yfinance
        stock = yf.Ticker(ticker)
        info = stock.info

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

        # Return metadata
        return metadata
