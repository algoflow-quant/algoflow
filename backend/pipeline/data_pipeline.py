from typing import List, Dict, Optional, Any
from datetime import datetime, date
import pandas as pd
import yfinance as yf
import os
import json
import logging
from tqdm import tqdm

class DataPipeline:
    """
    Main data pipeline with date range and incremental scraping
    """
    
    def __init__(self):
        # Load/download tickers
        self.tickers = self._load_tickers()

    def scrape_metadata(self, tickers: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Scrape fundamental metadata for tickers

        Args:
            tickers: List of ticker symbols

        Returns:
            Dictionary mapping ticker to metadata dict
        """

        metadata_dict = {}
        failed_tickers = []

        # Suppress yfinance output
        yf_logger = logging.getLogger('yfinance')
        yf_logger.disabled = True

        # Track field availability stats
        field_counts = {}

        for ticker in tqdm(tickers[0:400], desc="Scraping metadata"):
            try:
                stock = yf.Ticker(ticker)
                info = stock.info

                # Skip if no data returned
                if not info or 'symbol' not in info:
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
                print(f"Error scraping {ticker}: {e}")
                failed_tickers.append(ticker)
                continue

        return metadata_dict
    
    def scrape_date_range(
        self,
        tickers: List[str],
        start_date: date,
        end_date: date,
        interval: str = '1d'
    ) -> tuple[Dict[str, pd.DataFrame], List[str]]:
        """
        Scrape historical data for a specific date range.

        Args:
            tickers: List of ticker symbols
            start_date: Start date
            end_date: End date
            interval: Data interval (1d only)

        Returns:
            Dictionary mapping tickers to data
        """
        data_dict = {}
        failed_tickers = []
        total = len(tickers)
        print(f"Starting to scrape {total} tickers from {start_date} to {end_date}")
        
        # Configure logger to supress yfinance output
        yf_logger = logging.getLogger('yfinance')
        yf_logger.disabled = True
        
        for i, ticker in tqdm(enumerate(tickers, 1), desc="Scraping tickers"):
            try:
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
                    data_dict[ticker] = ticker_data
                    if i % 100 == 0:
                        print(f"\nProgress: {i}/{total} tickers scraped\nFailed tickers: {len(failed_tickers)}")
                else:
                    failed_tickers.append(ticker)
            
            except Exception as e:
                print(f"Error scraping {ticker}: {e}")
                failed_tickers.append(ticker)
                continue
        
        print(f"\nScraping complete!")
        print(f"Successfully scraped: {len(data_dict)} tickers")
        if failed_tickers:
            print(f"Failed to scrape: {len(failed_tickers)} tickers")
            if len(failed_tickers) <= 10:
                print(f"Failed tickers: {failed_tickers}")

        return (data_dict, failed_tickers)
    
    def _scrape_tickers(self) -> List[str]:
        """Scrapes tickers from nasdaq"""
        nasdaq_url = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
        
        # Read the nasdaq url file with | as the separator
        df = pd.read_csv(nasdaq_url, sep='|')
        
        # Remove nan values from the data
        df = df.dropna(subset=['Symbol']) 
        
        # Extract the Symbol column to a list & remove test symbol
        tickers = df[df['Test Issue'] == 'N']['Symbol'].tolist()
        
        
        # Return ticker list
        return tickers
    
    def _save_tickers(self, tickers: List[str], filename: str = "tickers.json") -> None:
        """Save tickers to JSON with extra data"""
        data = {
            "source": "nasdaq",
            "updated": datetime.now().isoformat(),
            "count": len(tickers),
            "tickers": tickers
        }
        filepath = os.path.join(os.path.dirname(__file__), filename)
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"Saved {len(tickers)} tickers to {filename}")
        
    def _remove_tickers(self, tickers_to_remove: List[str], filename: str = "tickers.json") -> None:
        """Remove failed tickers from the saved ticker list"""
        filepath = os.path.join(os.path.dirname(__file__), filename)
        
        # Load current tickers
        with open(filepath, 'r') as f:
            data = json.load(f)

        # Remove the failed tickers
        original_count = len(data['tickers'])
        data['tickers'] = [t for t in data['tickers'] if t not in tickers_to_remove]
        removed_count = original_count - len(data['tickers'])

        # Update metadata
        data['updated'] = datetime.now().isoformat()
        data['count'] = len(data['tickers'])
        data['last_cleanup'] = datetime.now().isoformat()
        data['removed_count'] = removed_count

        # Save updated list
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)

        print(f"Removed {removed_count} tickers from {filename}")
        print(f"Remaining tickers: {data['count']}")
    
    def _load_tickers(self, filename: str = "tickers.json") -> List[str]:
        """Load tickers from JSON file"""
        filepath = os.path.join(os.path.dirname(__file__), filename)

        if not os.path.exists(filepath):
            print("No saved tickers found, fetching fresh...")
            tickers = self._scrape_tickers()
            self._save_tickers(tickers, filename)
            return tickers

        with open(filepath, 'r') as f:
            data = json.load(f)

        print(f"Loaded {data['count']} tickers from {data['updated']}")
        return data['tickers']
            

if __name__ == "__main__":
    pipeline = DataPipeline()
    data = pipeline.scrape_metadata(pipeline.tickers)
    