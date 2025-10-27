import pytest
import sys
from sec_data_pipeline.yfinance.yfinance_tickers import YfinanceTickers
from unittest.mock import patch, MagicMock
import pandas as pd

@pytest.fixture
def fake_sp500():
    # fake table that resembles wikepedia's tickers
    fake_table = pd.DataFrame({
        "Symbol": ["MMM", "AOS", "D.ASH"],
        "Security": ["3M", "A. O. Smith", "Dash-Tester"]
    })

    return [fake_table]

def test_sp500(fake_sp500):
    """
    Success test sp500 to make sure it adds correct tickers to the list in correct format
    Args: fake_sp500
    Tests:
        passing the fake table through gives us a list of the fixed tickers
    """
    with patch("sec_data_pipeline.yfinance.yfinance_tickers.requests.get"):
        with patch("sec_data_pipeline.yfinance.yfinance_tickers.pd.read_html", return_value = fake_sp500):
            tickers = YfinanceTickers()
            result = tickers.scrape_sp500_tickers()

    assert result == ["MMM", "AOS", "D-ASH"]
