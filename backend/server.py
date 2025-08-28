# /backend/server.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from vnstock import Listing, Quote, Trading
from datetime import datetime, timedelta
import pandas as pd  # <-- THÊM DÒNG NÀY
import json
import time
from pathlib import Path

from cache_manager import CacheManager


class BacktestingEngine:
    """Simple backtesting engine for equity strategies."""

    def __init__(
        self,
        prices,
        buy_conditions,
        sell_conditions,
        initial_capital=1000000,
        fee=0.0,
    ):
        self.prices = prices
        self.buy_conditions = buy_conditions or []
        self.sell_conditions = sell_conditions or []
        self.initial_capital = initial_capital
        self.fee = fee
        self.cash = initial_capital
        self.position = None
        self.trades = []

    # ------------------------------------------------------------------
    def run(self):
        equity_curve = []
        for i, candle in enumerate(self.prices):
            price = candle.get("close")
            if price is None:
                continue

            if self.position is None and self._check_conditions(self.buy_conditions, i):
                qty = int(self.cash // (price * (1 + self.fee)))
                if qty > 0:
                    cost = qty * price * (1 + self.fee)
                    self.cash -= cost
                    self.position = {
                        "quantity": qty,
                        "buy_price": price,
                        "buy_time": candle.get("time"),
                    }
                # record equity after possible buy
                equity_curve.append(
                    self.cash
                    + (self.position["quantity"] * price if self.position else 0)
                )
                continue

            if self.position and self._check_conditions(self.sell_conditions, i):
                revenue = self.position["quantity"] * price * (1 - self.fee)
                profit = revenue - self.position["quantity"] * self.position["buy_price"]
                self.cash += revenue
                self.trades.append(
                    {
                        "buy_time": self.position["buy_time"],
                        "buy_price": self.position["buy_price"],
                        "sell_time": candle.get("time"),
                        "sell_price": price,
                        "profit": profit,
                    }
                )
                self.position = None

            equity = self.cash
            if self.position:
                equity += self.position["quantity"] * price
            equity_curve.append(equity)

        metrics = self._calculate_metrics(equity_curve)
        return {
            "cash": self.cash,
            "position": self.position,
            "trades": self.trades,
            "metrics": metrics,
        }

    # ------------------------------------------------------------------
    def _check_conditions(self, conditions, index):
        if not conditions:
            return False
        for cond in conditions:
            if not self._evaluate_condition(cond, index):
                return False
        return True

    # ------------------------------------------------------------------
    def _evaluate_condition(self, condition, index):
        ctype = condition.get("type")
        params = condition.get("params", {})
        if ctype == "price":
            operator = params.get("operator", "<")
            value = params.get("value", 0)
            current = self.prices[index]["close"]
            if operator == "<":
                return current < value
            if operator == ">":
                return current > value
            return False

        if ctype == "rsi":
            operator = params.get("operator", "<")
            value = params.get("value", 30)
            rsi = self._calculate_rsi(index)
            if rsi is None:
                return False
            if operator == "<":
                return rsi < value
            if operator == ">":
                return rsi > value
            return False

        if ctype == "sma-crossover":
            short_p = params.get("shortPeriod", 9)
            long_p = params.get("longPeriod", 20)
            direction = params.get("direction", "")
            if index < long_p or index < 1:
                return False
            short_sma = self._calculate_sma(short_p, index)
            long_sma = self._calculate_sma(long_p, index)
            prev_short = self._calculate_sma(short_p, index - 1)
            prev_long = self._calculate_sma(long_p, index - 1)
            if direction.find("cắt lên") != -1:
                return prev_short < prev_long and short_sma > long_sma
            if direction.find("cắt xuống") != -1:
                return prev_short > prev_long and short_sma < long_sma
            return False

        return False

    # ------------------------------------------------------------------
    def _calculate_sma(self, period, end_index):
        if end_index + 1 < period:
            return None
        total = sum(
            self.prices[i]["close"] for i in range(end_index - period + 1, end_index + 1)
        )
        return total / period

    # ------------------------------------------------------------------
    def _calculate_rsi(self, end_index, period=14):
        if end_index < period:
            return None
        gains = 0.0
        losses = 0.0
        for i in range(end_index - period + 1, end_index + 1):
            change = self.prices[i]["close"] - self.prices[i - 1]["close"]
            if change > 0:
                gains += change
            else:
                losses -= change
        if losses == 0:
            return 100
        avg_gain = gains / period
        avg_loss = losses / period
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))

    # ------------------------------------------------------------------
    def _calculate_metrics(self, equity_curve):
        final_value = equity_curve[-1] if equity_curve else self.initial_capital
        total_return = (final_value - self.initial_capital) / self.initial_capital

        wins = [t["profit"] for t in self.trades if t["profit"] > 0]
        losses = [t["profit"] for t in self.trades if t["profit"] < 0]

        winrate = len(wins) / len(self.trades) if self.trades else 0.0
        total_profit = sum(wins)
        total_loss = -sum(losses)  # convert to positive
        profit_factor = total_profit / total_loss if total_loss > 0 else None

        peak = equity_curve[0] if equity_curve else self.initial_capital
        max_drawdown = 0.0
        for value in equity_curve:
            if value > peak:
                peak = value
            drawdown = (peak - value) / peak if peak else 0
            if drawdown > max_drawdown:
                max_drawdown = drawdown

        return {
            "total_return": total_return,
            "winrate": winrate,
            "max_drawdown": max_drawdown,
            "profit_factor": profit_factor,
            "num_trades": len(self.trades),
        }


app = Flask(__name__)
CORS(app)
cache = CacheManager()

print("Đang tải danh sách công ty...")
try:
    listing_manager = Listing()
    all_companies_df = listing_manager.symbols_by_exchange()
    all_companies_df.set_index('symbol', inplace=True)
    trading_manager = Trading()
    print("Tải danh sách công ty thành công.")
except Exception as e:
    print(f"Lỗi khi tải danh sách công ty: {e}")
    all_companies_df = None
    trading_manager = None


@app.route('/api/all_companies')
def get_all_companies():
    if all_companies_df is None:
        return jsonify({"error": "Danh sách công ty chưa được tải."}), 500
    try:
        companies_list = all_companies_df.reset_index()
        result = companies_list[['symbol', 'organ_name']].to_dict(orient='records')
        return jsonify(result)
    except Exception as e:
        print(f"Lỗi khi xử lý danh sách công ty: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/company_info')
def get_company_info():
    symbol = request.args.get('symbol', 'VND').upper()
    if all_companies_df is None:
        return jsonify({"error": "Danh sách công ty chưa được tải."}), 500

    try:
        if symbol in all_companies_df.index:
            company_name = all_companies_df.loc[symbol]['organ_name']
            return jsonify({"fullName": company_name})
        else:
            return jsonify({"fullName": f"Không tìm thấy tên cho mã {symbol}"})
    except Exception as e:
        print(f"Lỗi khi tra cứu thông tin cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/history')
def get_history():
    symbol = request.args.get('symbol', 'VND').upper()
    resolution = request.args.get('resolution', '1D')

    end_date_str = request.args.get('to', datetime.now().strftime('%Y-%m-%d'))
    default_start_date = (datetime.strptime(end_date_str, '%Y-%m-%d') - timedelta(days=365*5)).strftime('%Y-%m-%d')
    start_date_str = request.args.get('from', default_start_date)

    print(f"Đang lấy dữ liệu cho {symbol} từ {start_date_str} đến {end_date_str}...")

    cache_key = f"history_{symbol}_{resolution}_{start_date_str}_{end_date_str}"
    cached = cache.get(cache_key)
    if cached is not None:
        print(f"Sử dụng dữ liệu cache cho {symbol}.")
        return jsonify(cached)

    try:
        quote_requester = Quote(symbol=symbol)
        df = quote_requester.history(start=start_date_str, end=end_date_str, interval=resolution)

        if df.empty:
            print(f"Không tìm thấy dữ liệu cho mã {symbol}.")
            return jsonify([])

        df.dropna(inplace=True)
        df['time'] = df['time'].dt.strftime('%Y-%m-%d')
        records = df.to_dict(orient='records')
        cache.set(cache_key, records, ttl=86400)

        print(f"Lấy dữ liệu SẠCH thành công cho {symbol}.")
        return jsonify(records)

    except Exception as e:
        print(f"Đã xảy ra lỗi khi lấy dữ liệu cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500

# ▼▼▼ THAY ĐỔI TOÀN BỘ HÀM NÀY ▼▼▼
@app.route('/api/market_data')
def get_market_data():
    symbol = request.args.get('symbol', 'VNINDEX').upper()
    if trading_manager is None:
        return jsonify({"error": "Trading manager chưa được khởi tạo."}), 500

    cache_key = f"market_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        print(f"Sử dụng dữ liệu thị trường cache cho {symbol}.")
        return jsonify(cached)

    print(f"Đang lấy dữ liệu thị trường cho {symbol}...")
    try:
        data = trading_manager.price_board([symbol])
        if data.empty:
            return jsonify({"error": f"Không tìm thấy dữ liệu cho mã {symbol}"}), 404
        
        # === BẮT ĐẦU SỬA LỖI ===
        # 1. Làm phẳng các cột MultiIndex thành cột đơn
        # Ví dụ: ('ticker', '') -> 'ticker' và ('price', 'high') -> 'price_high'
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = ['_'.join(filter(None, col)).strip() for col in data.columns.values]

        # 2. Chuyển index (mã cổ phiếu) thành một cột thông thường
        data.reset_index(inplace=True)
        # === KẾT THÚC SỬA LỖI ===

        # Bây giờ DataFrame đã an toàn để chuyển đổi
        result = data.to_dict(orient='records')[0]
        cache.set(cache_key, result, ttl=60)

        print(f"Lấy dữ liệu thị trường thành công cho {symbol}.")
        return jsonify(result)

    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu thị trường cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500
# ▲▲▲ KẾT THÚC THAY ĐỔI ▲▲▲


@app.route('/api/screener')
def api_screener():
    try:
        from vnstock import Screener  # runtime import in case version differs at startup
    except Exception:
        Screener = None
    if Screener is None:
        return jsonify({"error": "Screener không khả dụng (thiếu vnstock.Screener)."}), 501
    exchange = request.args.get('exchange', 'HOSE,HNX,UPCOM')
    limit = int(request.args.get('limit', 500))
    params = {"exchangeName": exchange}
    cache_key = f"screener_{exchange}_{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        df = Screener().stock(params=params, limit=limit)
        if df is None or df.empty:
            return jsonify([])
        records = df.to_dict(orient='records')
        cache.set(cache_key, records, ttl=300)
        return jsonify(records)
    except Exception as e:
        print(f"Lỗi Screener: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/financials')
def api_financials():
    symbol = (request.args.get('symbol') or 'FPT').upper()
    ftype = request.args.get('type', 'income')
    period = request.args.get('period', 'quarter')
    limit = int(request.args.get('limit', 8))
    try:
        from vnstock import Finance
    except Exception:
        Finance = None
    if Finance is None:
        return jsonify({"error": "Finance API không khả dụng trong vnstock hiện tại."}), 501
    cache_key = f"financials_{symbol}_{ftype}_{period}_{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        fin = Finance(symbol)
        df = None
        if hasattr(fin, 'financials'):
            df = fin.financials(statement=ftype, period=period, limit=limit)
        elif hasattr(fin, 'statement'):
            df = fin.statement(kind=ftype, period=period, limit=limit)
        if df is None or (hasattr(df, 'empty') and df.empty):
            return jsonify([])
        records = df.to_dict(orient='records') if hasattr(df, 'to_dict') else df
        cache.set(cache_key, records, ttl=86400)
        return jsonify(records)
    except Exception as e:
        print(f"Lỗi Financials cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/ratios')
def api_ratios():
    symbol = (request.args.get('symbol') or 'FPT').upper()
    try:
        from vnstock import Finance
    except Exception:
        Finance = None
    if Finance is None:
        return jsonify({"error": "Finance API không khả dụng để lấy ratios."}), 501
    cache_key = f"ratios_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        fin = Finance(symbol)
        df = None
        if hasattr(fin, 'ratios'):
            df = fin.ratios()
        elif hasattr(fin, 'ratio'):
            df = fin.ratio()
        if df is None or (hasattr(df, 'empty') and df.empty):
            return jsonify([])
        records = df.to_dict(orient='records') if hasattr(df, 'to_dict') else df
        cache.set(cache_key, records, ttl=86400)
        return jsonify(records)
    except Exception as e:
        print(f"Lỗi Ratios cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/news')
def api_news():
    symbol = (request.args.get('symbol') or 'FPT').upper()
    limit = int(request.args.get('limit', 20))
    try:
        from vnstock import News
    except Exception:
        News = None
    if News is None:
        return jsonify({"error": "News API không khả dụng trong vnstock hiện tại."}), 501
    cache_key = f"news_{symbol}_{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        client = News()
        df = None
        if hasattr(client, 'by_symbol'):
            df = client.by_symbol(symbol=symbol, limit=limit)
        elif hasattr(client, 'search'):
            df = client.search(symbol=symbol, limit=limit)
        if df is None or (hasattr(df, 'empty') and df.empty):
            return jsonify([])
        records = df.to_dict(orient='records') if hasattr(df, 'to_dict') else df
        cache.set(cache_key, records, ttl=600)
        return jsonify(records)
    except Exception as e:
        print(f"Lỗi News cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/backtest', methods=['POST'])
def run_backtest():
    data = request.get_json() or {}
    prices = data.get('prices', [])
    buy_conditions = data.get('buyConditions', [])
    sell_conditions = data.get('sellConditions', [])
    settings = data.get('settings', {})

    engine = BacktestingEngine(
        prices,
        buy_conditions,
        sell_conditions,
        initial_capital=settings.get('initialCapital', 1000000),
        fee=settings.get('fee', 0.0),
    )
    result = engine.run()
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
