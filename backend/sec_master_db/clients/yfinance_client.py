import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging
from typing import Optional, List, Dict
import pandas as pd
from datetime import date

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
      
    def update_security_metadata(self, ticker: str, start_date: Optional[date] = None, end_date: Optional[date] = None, bar_count: Optional[int] = None):
        """
        Update security_master.securities with data availability info
        Updates: start_data, end_data, bar_count after OHLCV insertion
        """
        session = self.Session()

        try:
            # Get security_id
            security_id = self.get_security_id(ticker)

            if not security_id:
                self.logger.error(f"Security {ticker} not found")
                return None

            # If dates not provided, calculate from OHLCV table
            if not start_date or not end_date or bar_count is None:
                # Query to get min date, max date, and count from OHLCV
                stats_query = text("""
                    SELECT
                        MIN(date) as start_date,
                        MAX(date) as end_date,
                        COUNT(*) as bar_count
                    FROM yfinance.ohlcv_data
                    WHERE security_id = :security_id
                """)

                result = session.execute(stats_query, {'security_id': security_id})
                row = result.fetchone()

                if row:
                    start_date = start_date or row[0]
                    end_date = end_date or row[1]
                    bar_count = bar_count if bar_count is not None else row[2]

            # Update the securities table
            update_query = text("""
                UPDATE security_master.securities
                SET
                    start_data = :start_date,
                    end_data = :end_date,
                    bar_count = :bar_count
                WHERE security_id = :security_id
            """)

            session.execute(update_query, {
                'security_id': security_id,
                'start_date': start_date,
                'end_date': end_date,
                'bar_count': bar_count
            })

            session.commit()
            self.logger.info(f"Updated security metadata for {ticker}: {start_date} to {end_date} ({bar_count} bars)")

        except Exception as e:
            session.rollback()
            self.logger.error(f"Error updating security metadata for {ticker}: {e}")
            raise
        finally:
            session.close()
    
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
            
            
        
    
    def insert_metadata(self, ticker: str, metadata: Dict):
        """
        Insert metadata for a ticker into yfinance.stock_metadata table
        """
        session = self.Session()

        try:
            # Get security_id
            security_id = self.get_security_id(ticker)

            if not security_id:
                self.logger.error(f"Security {ticker} not found. Insert ticker first")
                return None

            # Build the INSERT query with all columns
            query = text("""
                INSERT INTO yfinance.stock_metadata (
                    security_id, date_scraped,
                    -- Company Basic Info
                    company_name, exchange, country, sector, industry,
                    market_cap, enterprise_value, shares_outstanding, float_shares,
                    -- Valuation Metrics
                    price_to_book, forward_pe, ev_to_ebitda, ev_to_revenue, price_to_sales,
                    -- Profitability & Quality
                    gross_margin, operating_margin, profit_margin,
                    return_on_equity, return_on_assets, free_cash_flow_yield,
                    -- Growth Metrics
                    revenue_growth_yoy, revenue_per_share,
                    -- Financial Health
                    debt_to_equity, current_ratio, quick_ratio,
                    total_cash, total_debt, total_cash_per_share, book_value,
                    -- Cash Flow
                    operating_cash_flow, free_cash_flow,
                    -- Dividends
                    payout_ratio,
                    -- Short Interest & Ownership
                    short_percent_of_float, short_ratio, shares_short,
                    shares_percent_shares_out, held_percent_institutions, held_percent_insiders,
                    -- Analyst Coverage
                    target_mean_price, target_price_upside, number_of_analysts, recommendation_key,
                    -- Market Performance
                    beta, fifty_two_week_high, fifty_two_week_low,
                    fifty_two_week_change, sp500_52_week_change,
                    fifty_day_average, two_hundred_day_average,
                    -- Trading Volume
                    average_volume, average_volume_10days, regular_market_volume,
                    -- Metadata
                    data_source
                )
                VALUES (
                    :security_id, :date_scraped,
                    -- Company Basic Info
                    :company_name, :exchange, :country, :sector, :industry,
                    :market_cap, :enterprise_value, :shares_outstanding, :float_shares,
                    -- Valuation Metrics
                    :price_to_book, :forward_pe, :ev_to_ebitda, :ev_to_revenue, :price_to_sales,
                    -- Profitability & Quality
                    :gross_margin, :operating_margin, :profit_margin,
                    :return_on_equity, :return_on_assets, :free_cash_flow_yield,
                    -- Growth Metrics
                    :revenue_growth_yoy, :revenue_per_share,
                    -- Financial Health
                    :debt_to_equity, :current_ratio, :quick_ratio,
                    :total_cash, :total_debt, :total_cash_per_share, :book_value,
                    -- Cash Flow
                    :operating_cash_flow, :free_cash_flow,
                    -- Dividends
                    :payout_ratio,
                    -- Short Interest & Ownership
                    :short_percent_of_float, :short_ratio, :shares_short,
                    :shares_percent_shares_out, :held_percent_institutions, :held_percent_insiders,
                    -- Analyst Coverage
                    :target_mean_price, :target_price_upside, :number_of_analysts, :recommendation_key,
                    -- Market Performance
                    :beta, :fifty_two_week_high, :fifty_two_week_low,
                    :fifty_two_week_change, :sp500_52_week_change,
                    :fifty_day_average, :two_hundred_day_average,
                    -- Trading Volume
                    :average_volume, :average_volume_10days, :regular_market_volume,
                    -- Metadata
                    :data_source
                )
                ON CONFLICT (security_id, date_scraped)
                DO UPDATE SET
                    company_name = EXCLUDED.company_name,
                    exchange = EXCLUDED.exchange,
                    country = EXCLUDED.country,
                    sector = EXCLUDED.sector,
                    industry = EXCLUDED.industry,
                    market_cap = EXCLUDED.market_cap,
                    enterprise_value = EXCLUDED.enterprise_value,
                    shares_outstanding = EXCLUDED.shares_outstanding,
                    float_shares = EXCLUDED.float_shares,
                    price_to_book = EXCLUDED.price_to_book,
                    forward_pe = EXCLUDED.forward_pe,
                    ev_to_ebitda = EXCLUDED.ev_to_ebitda,
                    ev_to_revenue = EXCLUDED.ev_to_revenue,
                    price_to_sales = EXCLUDED.price_to_sales,
                    gross_margin = EXCLUDED.gross_margin,
                    operating_margin = EXCLUDED.operating_margin,
                    profit_margin = EXCLUDED.profit_margin,
                    return_on_equity = EXCLUDED.return_on_equity,
                    return_on_assets = EXCLUDED.return_on_assets,
                    free_cash_flow_yield = EXCLUDED.free_cash_flow_yield,
                    revenue_growth_yoy = EXCLUDED.revenue_growth_yoy,
                    revenue_per_share = EXCLUDED.revenue_per_share,
                    debt_to_equity = EXCLUDED.debt_to_equity,
                    current_ratio = EXCLUDED.current_ratio,
                    quick_ratio = EXCLUDED.quick_ratio,
                    total_cash = EXCLUDED.total_cash,
                    total_debt = EXCLUDED.total_debt,
                    total_cash_per_share = EXCLUDED.total_cash_per_share,
                    book_value = EXCLUDED.book_value,
                    operating_cash_flow = EXCLUDED.operating_cash_flow,
                    free_cash_flow = EXCLUDED.free_cash_flow,
                    payout_ratio = EXCLUDED.payout_ratio,
                    short_percent_of_float = EXCLUDED.short_percent_of_float,
                    short_ratio = EXCLUDED.short_ratio,
                    shares_short = EXCLUDED.shares_short,
                    shares_percent_shares_out = EXCLUDED.shares_percent_shares_out,
                    held_percent_institutions = EXCLUDED.held_percent_institutions,
                    held_percent_insiders = EXCLUDED.held_percent_insiders,
                    target_mean_price = EXCLUDED.target_mean_price,
                    target_price_upside = EXCLUDED.target_price_upside,
                    number_of_analysts = EXCLUDED.number_of_analysts,
                    recommendation_key = EXCLUDED.recommendation_key,
                    beta = EXCLUDED.beta,
                    fifty_two_week_high = EXCLUDED.fifty_two_week_high,
                    fifty_two_week_low = EXCLUDED.fifty_two_week_low,
                    fifty_two_week_change = EXCLUDED.fifty_two_week_change,
                    sp500_52_week_change = EXCLUDED.sp500_52_week_change,
                    fifty_day_average = EXCLUDED.fifty_day_average,
                    two_hundred_day_average = EXCLUDED.two_hundred_day_average,
                    average_volume = EXCLUDED.average_volume,
                    average_volume_10days = EXCLUDED.average_volume_10days,
                    regular_market_volume = EXCLUDED.regular_market_volume,
                    last_updated = CURRENT_TIMESTAMP
            """)

            # Map metadata dict keys to database columns
            params = {
                'security_id': security_id,
                'date_scraped': metadata.get('date_scraped'),
                'company_name': metadata.get('company_name'),
                'exchange': metadata.get('exchange'),
                'country': metadata.get('country'),
                'sector': metadata.get('sector'),
                'industry': metadata.get('industry'),
                'market_cap': metadata.get('market_cap'),
                'enterprise_value': metadata.get('enterprise_value'),
                'shares_outstanding': metadata.get('shares_outstanding'),
                'float_shares': metadata.get('float_shares'),
                'price_to_book': metadata.get('price_to_book'),
                'forward_pe': metadata.get('forward_pe'),
                'ev_to_ebitda': metadata.get('ev_to_ebitda'),
                'ev_to_revenue': metadata.get('ev_to_revenue'),
                'price_to_sales': metadata.get('price_to_sales'),
                'gross_margin': metadata.get('gross_margin'),
                'operating_margin': metadata.get('operating_margin'),
                'profit_margin': metadata.get('profit_margin'),
                'return_on_equity': metadata.get('return_on_equity'),
                'return_on_assets': metadata.get('return_on_assets'),
                'free_cash_flow_yield': metadata.get('free_cash_flow_yield'),
                'revenue_growth_yoy': metadata.get('revenue_growth_yoy'),
                'revenue_per_share': metadata.get('revenue_per_share'),
                'debt_to_equity': metadata.get('debt_to_equity'),
                'current_ratio': metadata.get('current_ratio'),
                'quick_ratio': metadata.get('quick_ratio'),
                'total_cash': metadata.get('total_cash'),
                'total_debt': metadata.get('total_debt'),
                'total_cash_per_share': metadata.get('total_cash_per_share'),
                'book_value': metadata.get('book_value'),
                'operating_cash_flow': metadata.get('operating_cash_flow'),
                'free_cash_flow': metadata.get('free_cash_flow'),
                'payout_ratio': metadata.get('payout_ratio'),
                'short_percent_of_float': metadata.get('short_percent_of_float'),
                'short_ratio': metadata.get('short_ratio'),
                'shares_short': metadata.get('shares_short'),
                'shares_percent_shares_out': metadata.get('shares_percent_shares_out'),
                'held_percent_institutions': metadata.get('held_percent_institutions'),
                'held_percent_insiders': metadata.get('held_percent_insiders'),
                'target_mean_price': metadata.get('target_mean_price'),
                'target_price_upside': metadata.get('target_price_upside'),
                'number_of_analysts': metadata.get('number_of_analysts'),
                'recommendation_key': metadata.get('recommendation_key'),
                'beta': metadata.get('beta'),
                # Note: scraper uses '52_week_high' but DB uses 'fifty_two_week_high'
                'fifty_two_week_high': metadata.get('52_week_high'),
                'fifty_two_week_low': metadata.get('52_week_low'),
                'fifty_two_week_change': metadata.get('52_week_change'),
                'sp500_52_week_change': metadata.get('sp500_52_week_change'),
                'fifty_day_average': metadata.get('50_day_average'),
                'two_hundred_day_average': metadata.get('200_day_average'),
                'average_volume': metadata.get('average_volume'),
                'average_volume_10days': metadata.get('average_volume_10days'),
                'regular_market_volume': metadata.get('regular_market_volume'),
                'data_source': metadata.get('data_source', 'yfinance')
            }

            # Execute the query
            session.execute(query, params)
            session.commit()
            self.logger.info(f"Successfully inserted metadata for {ticker}")

        except Exception as e:
            session.rollback()
            self.logger.error(f"Error inserting metadata for {ticker}: {e}")
            raise
        finally:
            session.close()
    