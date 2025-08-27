from __future__ import annotations

"""Utility script to refresh cached market data."""

from datetime import datetime, timedelta
import argparse
from vnstock import Quote

from cache_manager import CacheManager


def refresh_history(symbol: str, days: int = 365) -> None:
    cache = CacheManager()
    end = datetime.now()
    start = end - timedelta(days=days)
    q = Quote(symbol=symbol)
    df = q.history(start=start.strftime("%Y-%m-%d"), end=end.strftime("%Y-%m-%d"), interval="1D")
    if df.empty:
        print(f"No data for {symbol}")
        return
    df.dropna(inplace=True)
    df["time"] = df["time"].dt.strftime("%Y-%m-%d")
    records = df.to_dict(orient="records")
    key = f"history_{symbol}_1D_{start.strftime('%Y-%m-%d')}_{end.strftime('%Y-%m-%d')}"
    cache.set(key, records)
    print(f"Cached history for {symbol}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Refresh cached history data")
    parser.add_argument("symbol", help="Ticker symbol to refresh")
    parser.add_argument("--days", type=int, default=365, help="How many days back to fetch")
    args = parser.parse_args()
    refresh_history(args.symbol.upper(), args.days)
