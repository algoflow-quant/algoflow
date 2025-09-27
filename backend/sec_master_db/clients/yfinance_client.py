import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging
from typing import Optional, List, Dict
import pandas as pd

class YfinanceClient:
    def __init__(self, db_url: Optional[str] = None):
        """
        Initialize with a db_url or defualt to the local dev
        """
        self.db_url = db_url or os.getenv(
              'SEC_MASTER_DB_URL_PROD',
              'postgresql://user:pass@localhost/sec_master_dev'  # Dev default
          )
        # Set up connection
        self.engine = create_engine(self.db_url)
        self.Session = sessionmaker(bind=self.engine)
        
        # Logger
        self.logger = logging.getLogger(self.__class__.__name__)
        
        
    # Security management methods    
    def insert_securities(self, tickers: List[str], groupings: List[str], provider: str = 'yfinance'):
        """
        Insert tickers into securities table with groupings, ticker, and date_created
        """
        
        session = self.Session()
        
        try:
            # Use PostgreSQL's UNNEST to insert multiple rows
            query = text("""
                INSERT INTO security_master.securities (ticker, provider, groupings, created_at)
                SELECT 
                    ticker,
                    :provider as provider,
                    :groupings as groupings,  -- This will be the array
                    NOW() as created_at
                FROM UNNEST(:tickers ::text[]) as ticker
                ON CONFLICT (ticker, provider) 
                DO NOTHING
            """)
            
            # Execute query
            session.execute(query, {'provider': provider, 'groupings': groupings, 'tickers': tickers})
            
            # Commit saves DB changes
            session.commit() 
            self.logger.info(f"Successfully inserted {len(tickers)} tickers")
            
        except Exception as e:
            session.rollback()  # Important: rollback on error so we dont commit partial data
            self.logger.error(f"Error inserting tickers: {e}")
            raise  # Re-raise so caller knows it failed
        finally:
            session.close()
    
    def get_tickers(self, groupings: Optional[str] = None): # -> List[str]:
        """
        Get all tickers, optionally filtered by multiple groupings
        """
        pass
      
    def get_security_id(self, ticker: str, provider: str = 'yfinance') -> Optional[int]:
        """
        Get the security id for a ticker/provider combo
        """
        session = self.Session()
        
        try:
            query = text("""
                SELECT security_id
                FROM security_master.securities
                WHERE ticker = :ticker AND provider = :provider
            """)
            
            # Execute SQL query
            result = session.execute(query, {'ticker': ticker, 'provider': provider})
            
            # Get the first row
            row = result.fetchone()
            
            # Return the security id
            return row[0] if row else None
        
        except Exception as e:
            self.logger.error(f"Error getting security_id for {ticker}: {e}")
            return None
        finally:
            session.close()
      
    def update_security_metadata(self, ticker: str, metadata: Dict):
        """
        update security table with extra data
        uses UPSERT normally and INSERT on conflict
        """
        pass
    
    # Yfinance Schema storage
    def insert_ohlcv(self, ticker: str, data: pd.DataFrame) -> None:
        """
        Insert OHLCV data for a single ticker
        """

        session = self.Session()

        try:
            # Get security id
            security_id = self.get_security_id(ticker)

            if not security_id:
                # Ticker not found
                self.logger.error(f"Security {ticker} not found. Insert ticker first")
                return None

            # Convert df into dict
            records = data.reset_index().to_dict('records')

            # Insert each record (each day of data)
            for record in records:
                query = text("""
                    INSERT INTO yfinance.ohlcv_data
                    (security_id, date, open, high, low, close, volume)
                    VALUES
                    (:security_id, :date, :open, :high, :low, :close, :volume)
                    ON CONFLICT (security_id, date)
                    DO UPDATE SET
                        open = EXCLUDED.open,
                        high = EXCLUDED.high,
                        low = EXCLUDED.low,
                        close = EXCLUDED.close,
                        volume = EXCLUDED.volume
                """)

                # Execute the query for this record
                # record is a dictionary with keys: 'Date', 'Open', 'High', 'Low', 'Close', 'Volume'
                session.execute(query, {
                    'security_id': security_id,
                    'date': record['Date'],
                    'open': record['Open'], 
                    'high': record['High'],
                    'low': record['Low'],
                    'close': record['Close'],
                    'volume': record['Volume']
                })

            # Commit all the inserts, saves db changes
            session.commit()
            self.logger.info(f"Inserted {len(records)} OHLCV records for {ticker}")

        except Exception as e:
            session.rollback()
            self.logger.error(f"Error inserting OHLCV for {ticker}: {e}")
            raise
        finally:
            session.close()
            
            
        
    
    def insert_metadata(self, metadata_dict: Dict[str, Dict]):
        """
        Insert metadata for a ticker
        """
    