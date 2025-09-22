from typing import List, Dict, Optional
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
        self.tickers = self.load_tickers()
        
    def load_tickers(self, filename: str = "tickers.json") -> List[str]:
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

    def scrape_incremental(
        self,
        tickers: List[str],
        last_update: Optional[datetime] = None
    ):# -> Dict[str, pd.DataFrame]:
        """
        Scrape until last_update

        Args:
            tickers: List of ticker symbols
            last_update: Timestamp of last update (if None, gets today's data)

        Returns:
            Dictionary mapping tickers to the data
        """
        pass
    
    def _scrape_tickers(self) -> List[str]:
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
        

if __name__ == "__main__":
    pipeline = DataPipeline()
    data, failed_tickers = pipeline.scrape_date_range(pipeline.tickers, date(2023, 1, 1), date(2025, 1, 1), '1d')
    if failed_tickers:
        pipeline._remove_tickers(failed_tickers)