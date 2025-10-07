# Native python modules
from datetime import date
from typing import Optional, List, Dict, Any

# Sqalchemy imports
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Use raw psycopg2 execute_values for 10-100x speed improvement
from psycopg2.extras import execute_values

# Pandas dataframe manipulation
import pandas as pd

# Logging
from loguru import logger

class YfinanceClient:
    def __init__(self, db_url: str):
        """
        Initialize YfinanceClient for database operations.

        Args:
            db_url: PostgreSQL connection string. If None, uses SEC_MASTER_DB_URL_PROD env var
                   or defaults to local dev database.

        Example:
            ```python
            client = YfinanceClient("postgresql://user:pass@localhost:5432/sec_master_dev")
            ```
        """
        # Set up connection
        self.engine = create_engine(db_url)
        self.Session = sessionmaker(bind=self.engine)
        
        
    # Security management methods    
    def insert_security(self, ticker: str, groupings: List[str], provider: str = 'yfinance') -> Dict[str, Any]:
        """
        Insert a ticker symbol into the security_master.securities table.

        Args:
            ticker: Ticker symbol (e.g., 'AAPL')
            groupings: List of grouping tags (e.g., ['sp500', 'tech', 'large-cap'])
            provider: Data provider name (default: 'yfinance')

        Returns:
            Dict with keys: success (bool), ticker (str), rows_affected (int), message (str)

        Raises:
            Exception: If database insertion fails

        Example:
            ```python
            result = client.insert_security('AAPL', ['sp500', 'nasdaq'])
            if result['rows_affected'] > 0:
                print("Inserted successfully")
            ```

        Note:
            Uses ON CONFLICT DO NOTHING, so duplicate tickers return rowcount=0.
        """

        session = self.Session()

        try:

            # Insert a security
            query = text("""
                INSERT INTO security_master.securities (ticker, provider, groupings, created_at)
                VALUES (:ticker, :provider, :groupings, NOW())
                ON CONFLICT (ticker, provider)
                DO NOTHING
            """)

            # Execute query
            result = session.execute(query, {'ticker': ticker, 'provider': provider, 'groupings': groupings})
            
            # Get the number of affected rows
            rows = getattr(result, 'rowcount', 0)
            
            # Commit saves DB changes
            session.commit()

            # Return a formatted summary dict
            return {
                'success': True,
                'ticker': ticker,
                'rows_affected': rows,
                'message': f"Inserted {ticker}" if rows > 0 else f"{ticker} already exists"
            }

        # Catch Error
        except Exception as e:
            session.rollback()  # Important: rollback on error so we dont commit partial data
            logger.error(f"Failed to insert security {ticker}: {e}")
            raise Exception(f"Security insertion failed for {ticker}: {str(e)}") from e
        finally:
            session.close()
    
    def get_security_id(self, ticker: str, provider: str = 'yfinance') -> Optional[int]:
        """
        Retrieve the unique security_id for a ticker symbol.

        Args:
            ticker: Ticker symbol (e.g., 'AAPL')
            provider: Data provider name (default: 'yfinance')

        Returns:
            int: The security_id if found, None if ticker doesn't exist

        Example:
            ```python
            security_id = client.get_security_id('AAPL')
            if security_id:
                print(f"AAPL has ID: {security_id}")
            ```

        Note:
            This ID is used as foreign key in OHLCV and metadata tables.
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
            if not row:
                raise ValueError(f"Security ID not found for ticker {ticker} with provider {provider}")
            return row[0]

        except Exception as e:
            logger.error(f"Failed to get security_id for {ticker}: {e}")
            raise Exception(f"Failed to retrieve security_id for {ticker}: {str(e)}") from e
        finally:
            session.close()
    
    # Yfinance Schema storage
    def insert_ohlcv(self, ticker: str, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Insert OHLCV (Open, High, Low, Close, Volume) data for a single ticker.

        Args:
            ticker: Ticker symbol (must exist in securities table)
            data: DataFrame with columns: Date (index), Open, High, Low, Close, Volume
                  Date can be either index or column.

        Returns:
            Dict with keys: success (bool), ticker (str), rows_affected (int), message (str)

        Raises:
            Exception: If ticker not found or insertion fails

        Example:
            ```python
            import yfinance as yf
            df = yf.download('AAPL', start='2024-01-01', end='2024-12-31')
            result = client.insert_ohlcv('AAPL', df)
            print(f"Inserted/updated {result['rows_affected']} rows")
            ```

        Note:
            Uses ON CONFLICT UPDATE to handle duplicate dates (updates existing records).
        """

        session = self.Session()

        try:
            # Get security id 
            security_id = self.get_security_id(ticker)

            # Prepare data as tuples for maximum performance
            records = data.reset_index()

            # Create list of tuples for execute_values (MUCH faster than execute_many)
            insert_data = [
                (
                    security_id,
                    row['Date'],
                    float(row['Open']),
                    float(row['High']),
                    float(row['Low']),
                    float(row['Close']),
                    int(row['Volume'])
                )
                for _, row in records.iterrows()
            ]

            # Get the raw connection from SQLAlchemy session
            raw_conn = session.connection().connection
            cursor = raw_conn.cursor()

            # Use execute_values with ON CONFLICT for bulk upsert (SUPER FAST!)
            execute_values(
                cursor,
                """
                INSERT INTO yfinance.ohlcv_data
                (security_id, date, open, high, low, close, volume)
                VALUES %s
                ON CONFLICT (security_id, date)
                DO UPDATE SET
                    open = EXCLUDED.open,
                    high = EXCLUDED.high,
                    low = EXCLUDED.low,
                    close = EXCLUDED.close,
                    volume = EXCLUDED.volume
                """,
                insert_data,
                template=None,  # Use default template
                page_size=1000  # Process 1000 rows at a time
            )

            # Get rows affected from cursor
            rows = cursor.rowcount # row update/insert count

            # Commit the changes
            raw_conn.commit()
            cursor.close()
            return {
                'success': True,
                'ticker': ticker,
                'rows_affected': rows,
                'message': f"Insert OHLCV for {ticker}" if rows > 0 else f"{ticker} already in OHLCV DB"
            }

        except Exception as e:
            # Rollback both the raw connection and session
            try:
                raw_conn.rollback()
            except:
                pass
            session.rollback()
            logger.error(f"Failed to insert OHLCV data for {ticker}: {e}")
            raise Exception(f"OHLCV insertion failed for {ticker}: {str(e)}") from e

        finally:
            session.close()
            
            
        
    
    def insert_metadata(self, ticker: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert comprehensive financial metadata for a ticker.

        Args:
            ticker: Ticker symbol (must exist in securities table)
            metadata: Dictionary containing financial metrics. Expected keys include:
                     - Company info: company_name, exchange, sector, industry, country
                     - Valuation: market_cap, enterprise_value, price_to_book, forward_pe
                     - Financials: gross_margin, operating_margin, profit_margin, debt_to_equity
                     - Performance: beta, 52_week_high, 52_week_low, average_volume
                     - And many more (see schema for full list)

        Returns:
            Dict with keys: success (bool), ticker (str), rows_affected (int), message (str)

        Raises:
            Exception: If ticker not found or insertion fails

        Example:
            ```python
            metadata = pipeline.scrape_metadata('AAPL')
            result = client.insert_metadata('AAPL', metadata)
            print(f"Rows affected: {result['rows_affected']}")
            ```

        Note:
            Missing keys are stored as NULL. Uses ON CONFLICT UPDATE for existing records.
        """
        session = self.Session()

        try:
            # Get security_id
            security_id = self.get_security_id(ticker)

            if not security_id:
                raise Exception(f"No security id for ticker: {ticker}")

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
            result = session.execute(query, params)

            # Get the number of affected rows
            rows = getattr(result, 'rowcount', 0)
            
            session.commit()
            return {
                'success': True,
                'ticker': ticker,
                'rows_affected': rows,
                'message': f"Inserted metadata for {ticker}" if rows > 0 else f"{ticker} already exists in metadata DB"
            }

        except Exception as e:
            session.rollback()
            logger.error(f"Failed to insert metadata for {ticker}: {e}")
            raise Exception(f"Metadata insertion failed for {ticker}: {str(e)}") from e
        finally:
            session.close()

    def get_tickers(self, groupings: Optional[List[str]] = None, provider: str = 'yfinance') -> List[str]:
        """
        Get tickers from database, optionally filtered by groupings

        Args:
            groupings: Optional list of groupings to filter by (e.g., ['sp500', 'nasdaq'])
                      If None, returns all tickers for the provider
            provider: Data provider (default: 'yfinance')

        Returns:
            List of ticker symbols

        Examples:
            ```python
            # Get all tickers
            all_tickers = client.get_tickers()

            # Get S&P 500 tickers
            sp500 = client.get_tickers(['sp500'])

            # Get both S&P 500 and NASDAQ tickers
            combined = client.get_tickers(['sp500', 'nasdaq'])
            ```
        """
        session = self.Session()

        try:
            if groupings:

                # Get tickers that have ANY of the specified groupings
                query = text("""
                    SELECT DISTINCT ticker
                    FROM security_master.securities
                    WHERE provider = :provider
                    AND groupings && :groupings_array  -- Array overlap operator
                    ORDER BY ticker
                """)

                result = session.execute(query, {
                    'provider': provider,
                    'groupings_array': groupings
                })
            else:

                # Select all
                query = text("""
                    SELECT ticker
                    FROM security_master.securities
                    WHERE provider = :provider
                    ORDER BY ticker
                """)

                result = session.execute(query, {'provider': provider})

            # Fetch tickers from result
            tickers = [row[0] for row in result.fetchall()]
            return tickers

        except Exception as e:
            logger.error(f"Failed to get tickers from database: {e}")
            raise Exception(f"Failed to retrieve tickers: {str(e)}") from e
        finally:
            session.close()