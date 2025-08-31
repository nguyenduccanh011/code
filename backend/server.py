# -*- coding: utf-8 -*-
# /backend/server.py

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from vnstock import Listing, Quote, Trading, Finance
from datetime import datetime, timedelta
import numpy as np
import pandas as pd  # <-- THÃŠM DÃ’NG NÃ€Y
import json
import re
import time
from pathlib import Path

from cache_manager import CacheManager

# Safe defaults for optional managers loaded at startup
listing_manager = None
all_companies_df = None
industries_df = None
trading_manager = None


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
            if direction.find("cáº¯t lÃªn") != -1:
                return prev_short < prev_long and short_sma > long_sma
            if direction.find("cáº¯t xuá»‘ng") != -1:
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

print("Äang táº£i danh sÃ¡ch cÃ´ng ty...")
try:
    listing_manager = Listing()
    all_companies_df = listing_manager.symbols_by_exchange()
    all_companies_df.set_index('symbol', inplace=True)
    industries_df = listing_manager.symbols_by_industries()
    industries_df.set_index('symbol', inplace=True)
    trading_manager = Trading()
    print("Táº£i danh sÃ¡ch cÃ´ng ty thÃ nh cÃ´ng.")
except Exception as e:
    print(f"Lá»—i khi táº£i danh sÃ¡ch cÃ´ng ty: {e}")
    all_companies_df = None
    industries_df = None
    trading_manager = None


@app.route('/api/all_companies')
def get_all_companies():
    if all_companies_df is None:
        return jsonify({"error": "Danh sÃ¡ch cÃ´ng ty chÆ°a Ä‘Æ°á»£c táº£i."}), 500
    try:
        companies_list = all_companies_df.reset_index()
        result = companies_list[['symbol', 'organ_name']].to_dict(orient='records')
        return jsonify(result)
    except Exception as e:
        print(f"Lá»—i khi xá»­ lÃ½ danh sÃ¡ch cÃ´ng ty: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/company_info')
def get_company_info():
    symbol = request.args.get('symbol', 'VND').upper()
    if all_companies_df is None:
        return jsonify({"error": "Danh sÃ¡ch cÃ´ng ty chÆ°a Ä‘Æ°á»£c táº£i."}), 500

    try:
        if symbol in all_companies_df.index:
            company_name = all_companies_df.loc[symbol]['organ_name']
            return jsonify({"fullName": company_name})
        else:
            return jsonify({"fullName": f"KhÃ´ng tÃ¬m tháº¥y tÃªn cho mÃ£ {symbol}"})
    except Exception as e:
        print(f"Lá»—i khi tra cá»©u thÃ´ng tin cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/all_companies_union')
def get_all_companies_union():
    """Union list of companies from Listing and Screener (if available). Cached 12h."""
    cache_key = 'all_companies_union'
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    if all_companies_df is None:
        return jsonify({"error": "Danh sách công ty chưa được tải."}), 500
    try:
        companies_list = all_companies_df.reset_index()
        companies_list['exchange'] = companies_list.get('exchange', None)
        base = companies_list[['symbol', 'organ_name', 'exchange']].to_dict(orient='records')
        merged = {str(x['symbol']).upper(): x for x in base}
        # Try enrich with Screener
        try:
            from vnstock import Screener
            df_sc = Screener().stock(params={"exchangeName": "HOSE,HNX,UPCOM"}, limit=3000)
            if df_sc is not None and not df_sc.empty:
                cols = [c.lower() for c in df_sc.columns]
                df_sc.columns = cols
                for _, row in df_sc.iterrows():
                    sym = str(row.get('ticker') or row.get('symbol') or '').upper()
                    if not sym:
                        continue
                    organ = row.get('organ_name') or row.get('company')
                    exch = row.get('exchange') or row.get('exchange_name')
                    it = merged.get(sym, {"symbol": sym, "organ_name": organ, "exchange": exch})
                    if organ and not it.get('organ_name'):
                        it['organ_name'] = organ
                    if exch and not it.get('exchange'):
                        it['exchange'] = exch
                    merged[sym] = it
        except Exception:
            pass
        result = list(merged.values())
        cache.set(cache_key, result, ttl=60*60*12)
        return jsonify(result)
    except Exception as e:
        print(f"Lỗi khi xử lý danh sách công ty (union): {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/history')
def get_history():
    symbol = request.args.get('symbol', 'VND').upper()
    resolution = request.args.get('resolution', '1D')

    end_date_str = request.args.get('to', datetime.now().strftime('%Y-%m-%d'))
    default_start_date = (datetime.strptime(end_date_str, '%Y-%m-%d') - timedelta(days=365*5)).strftime('%Y-%m-%d')
    start_date_str = request.args.get('from', default_start_date)

    print(f"Äang láº¥y dá»¯ liá»‡u cho {symbol} tá»« {start_date_str} Ä‘áº¿n {end_date_str}...")

    cache_key = f"history_{symbol}_{resolution}_{start_date_str}_{end_date_str}"
    cached = cache.get(cache_key)
    if cached is not None:
        print(f"Sá»­ dá»¥ng dá»¯ liá»‡u cache cho {symbol}.")
        return jsonify(cached)

    try:
        quote_requester = Quote(symbol=symbol)
        df = quote_requester.history(start=start_date_str, end=end_date_str, interval=resolution)

        if df.empty:
            print(f"KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u cho mÃ£ {symbol}.")
            return jsonify([])

        df.dropna(inplace=True)
        df['time'] = df['time'].dt.strftime('%Y-%m-%d')
        records = df.to_dict(orient='records')
        cache.set(cache_key, records, ttl=86400)

        print(f"Láº¥y dá»¯ liá»‡u Sáº CH thÃ nh cÃ´ng cho {symbol}.")
        return jsonify(records)

    except Exception as e:
        print(f"ÄÃ£ xáº£y ra lá»—i khi láº¥y dá»¯ liá»‡u cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500

# â–¼â–¼â–¼ THAY Äá»”I TOÃ€N Bá»˜ HÃ€M NÃ€Y â–¼â–¼â–¼
@app.route('/api/market_data')
def get_market_data():
    symbol = request.args.get('symbol', 'VNINDEX').upper()
    if trading_manager is None:
        return jsonify({"error": "Trading manager chÆ°a Ä‘Æ°á»£c khá»Ÿi táº¡o."}), 500

    cache_key = f"market_{symbol}"
    cached = cache.get(cache_key)
    if cached is not None:
        print(f"Sá»­ dá»¥ng dá»¯ liá»‡u thá»‹ trÆ°á»ng cache cho {symbol}.")
        return jsonify(cached)

    print(f"Äang láº¥y dá»¯ liá»‡u thá»‹ trÆ°á»ng cho {symbol}...")
    try:
        data = trading_manager.price_board([symbol])
        if data.empty:
            return jsonify({"error": f"KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u cho mÃ£ {symbol}"}), 404
        
        # === Báº®T Äáº¦U Sá»¬A Lá»–I ===
        # 1. LÃ m pháº³ng cÃ¡c cá»™t MultiIndex thÃ nh cá»™t Ä‘Æ¡n
        # VÃ­ dá»¥: ('ticker', '') -> 'ticker' vÃ  ('price', 'high') -> 'price_high'
        if isinstance(data.columns, pd.MultiIndex):
            data.columns = ['_'.join(filter(None, col)).strip() for col in data.columns.values]

        # 2. Chuyá»ƒn index (mÃ£ cá»• phiáº¿u) thÃ nh má»™t cá»™t thÃ´ng thÆ°á»ng
        data.reset_index(inplace=True)
        # === Káº¾T THÃšC Sá»¬A Lá»–I ===

        # BÃ¢y giá» DataFrame Ä‘Ã£ an toÃ n Ä‘á»ƒ chuyá»ƒn Ä‘á»•i
        result = data.to_dict(orient='records')[0]
        cache.set(cache_key, result, ttl=60)

        print(f"Láº¥y dá»¯ liá»‡u thá»‹ trÆ°á»ng thÃ nh cÃ´ng cho {symbol}.")
        return jsonify(result)

    except Exception as e:
        print(f"Lá»—i khi láº¥y dá»¯ liá»‡u thá»‹ trÆ°á»ng cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500
# â–²â–²â–² Káº¾T THÃšC THAY Äá»”I â–²â–²â–²


# duplicate /api/screener route removed during refactor


@app.route('/api/price_board')
def api_price_board():
    """Return price board snapshot for a list of symbols or by exchange.
       Query params:
         - symbols: comma-separated tickers (takes precedence)
         - exchange: comma-separated exchanges (default: HOSE,HNX,UPCOM) used when symbols not provided
         - limit: number of symbols to fetch when using exchange (default: 100)
    """
    global trading_manager
    if trading_manager is None:
        try:
            trading_manager = Trading()
        except Exception as e:
            return jsonify({"error": f"Trading manager init failed: {e}"}), 503

    symbols_param = request.args.get('symbols', '').strip()
    exchange = request.args.get('exchange', 'HOSE,HNX,UPCOM')
    limit = int(request.args.get('limit', 100))

    # Resolve symbols list
    if symbols_param:
        symbols = [s.strip().upper() for s in symbols_param.split(',') if s.strip()]
    else:
        symbols = []
        # Prefer Screener to fetch tickers by exchange; fallback to Listing table
        try:
            from vnstock import Screener
            sc = Screener()
            df_sc = sc.stock(params={"exchangeName": exchange}, limit=limit)
            if df_sc is not None and not df_sc.empty:
                cols = [c.lower() for c in df_sc.columns]
                df_sc.columns = cols
                if 'ticker' in df_sc.columns:
                    tickers = df_sc['ticker'].dropna().astype(str).str.upper().tolist()
                    symbols = tickers[:limit]
        except Exception:
            pass
        if not symbols:
            if all_companies_df is None:
                return jsonify({"error": "Danh sách công ty chưa được tải."}), 500
            try:
                df = all_companies_df.reset_index()
                if 'exchange' in df.columns and exchange:
                    wanted = set([x.strip().upper() for x in exchange.split(',') if x.strip()])
                    df = df[df['exchange'].astype(str).str.upper().isin(wanted)]
                sym_series = df['symbol'].dropna()
                symbols = [str(x).upper() for x in sym_series.head(limit).tolist()]
            except Exception as e:
                return jsonify({"error": f"Không lấy được danh sách mã: {e}"}), 500

        # Final sanitization: keep only valid ticker-like strings
        symbols = [s for s in symbols if isinstance(s, str) and s and s != 'NAN' and re.match(r'^[A-Z0-9]+$', s)]

    if not symbols:
        return jsonify([])

    # Use a safe cache key from sanitized symbols
    cache_key = f"price_board_{','.join(symbols[:50])}"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        try:
            df = trading_manager.price_board(symbols)
        except Exception as e:
            # Fallback: fetch per-symbol to avoid upstream batch errors
            frames = []
            for s in symbols:
                try:
                    f = trading_manager.price_board([s])
                    if f is not None and not f.empty:
                        frames.append(f)
                except Exception:
                    continue
            if frames:
                import pandas as _pd
                df = _pd.concat(frames)
            else:
                raise e
        if df is None or df.empty:
            return jsonify([])
        # Flatten multi-index columns if present (coerce non-strings safely)
        if isinstance(df.columns, pd.MultiIndex):
            new_cols = []
            for col in df.columns.values:
                parts = [p for p in col if p is not None and p != '']
                parts = [str(p) for p in parts]
                new_cols.append('_'.join(parts).strip())
            df.columns = new_cols
        else:
            # Ensure single-level columns are strings
            df.columns = [str(c) for c in df.columns]
        df = df.reset_index()
        # Normalize symbol column: prefer listing_symbol/ticker before using numeric index
        if 'symbol' not in df.columns:
            for cand in ['listing_symbol', 'ticker', 'listing_mapping_symbol']:
                if cand in df.columns:
                    df['symbol'] = df[cand]
                    break
        # If still missing, fallback to index only then
        if 'symbol' not in df.columns and 'index' in df.columns:
            df.rename(columns={'index': 'symbol'}, inplace=True)
        # Uppercase symbols when possible and drop invalid (numeric-only or empty)
        try:
            df['symbol'] = df['symbol'].astype(str).str.upper()
            mask_valid = df['symbol'].str.match(r'^(?=.*[A-Z])[A-Z0-9]+$')
            df = df[mask_valid]
        except Exception:
            pass
        # Heuristic normalization: add common fields if available under various names
        def pick(col_candidates):
            for c in col_candidates:
                if c in df.columns:
                    return c
            return None
        ceiling_col = pick(['ceiling', 'price_ceiling', 'tran', 'ceiling_price'])
        floor_col = pick(['floor', 'price_floor', 'san', 'floor_price'])
        reference_col = pick(['reference', 'ref', 'reference_price', 'ref_price', 'basic_price'])
        tick_col = pick(['price_step', 'tick_size', 'step'])
        rename_map = {}
        if ceiling_col and ceiling_col != 'ceiling': rename_map[ceiling_col] = 'ceiling'
        if floor_col and floor_col != 'floor': rename_map[floor_col] = 'floor'
        if reference_col and reference_col != 'reference': rename_map[reference_col] = 'reference'
        if tick_col and tick_col != 'tick_size': rename_map[tick_col] = 'tick_size'
        if rename_map:
            df = df.rename(columns=rename_map)
        # Attach exchange if available from all_companies_df
        if 'exchange' not in df.columns and all_companies_df is not None:
            try:
                exch_map = all_companies_df['exchange'].to_dict()
                df['exchange'] = df['ticker'].map(lambda s: exch_map.get(str(s).upper()))
            except Exception:
                pass
        # Strict JSON: replace NaN/inf with None
        try:
            df = df.replace({np.nan: None, np.inf: None, -np.inf: None})
        except Exception:
            pass
        records = df.to_dict(orient='records')
        cache.set(cache_key, records, ttl=10)  # short-lived cache
        return Response(json.dumps(records, ensure_ascii=False), mimetype='application/json; charset=utf-8')
    except Exception as e:
        return jsonify({"error": str(e), "where": "/api/price_board", "symbols": symbols[:5]}), 500


@app.route('/api/screener')
def api_screener():
    """Screener proxy with cleaned JSON (NaN->null, rounded numbers).
       Params:
         - exchange: comma-separated exchanges (default: HOSE,HNX,UPCOM)
         - limit: number of rows (default: 500)
         - columns: optional comma-separated list to keep
    """
    try:
        from vnstock import Screener
    except Exception:
        Screener = None
    if Screener is None:
        return jsonify({"error": "Screener unavailable (vnstock.Screener missing)."}), 501

    exchange = request.args.get('exchange', 'HOSE,HNX,UPCOM')
    limit = int(request.args.get('limit', 500))
    q = (request.args.get('q') or '').strip()
    params = {"exchangeName": exchange}

    cache_key = f"screener_{exchange}_{limit}_{q}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(json.dumps(cached, ensure_ascii=False), mimetype='application/json; charset=utf-8')

    try:
        # If searching, fetch a larger pool then filter
        fetch_limit = max(limit, 3000) if q else limit
        df = Screener().stock(params=params, limit=fetch_limit)
        if df is None or df.empty:
            return jsonify([])
        # Optional server-side search filter on ticker/name
        if q:
            q_upper = q.upper()
            # standardize column names
            cols = [c.lower() for c in df.columns]
            df.columns = cols
            if 'ticker' in df.columns:
                mask = df['ticker'].astype(str).str.upper().str.startswith(q_upper)
            else:
                mask = None
            if 'organ_name' in df.columns and len(q_upper) >= 2:
                name_mask = df['organ_name'].astype(str).str.upper().str.contains(q_upper)
                mask = name_mask if mask is None else (mask | name_mask)
            if mask is not None:
                df = df[mask]
            # slice back to requested limit
            df = df.head(limit)
        # 1) drop columns that are completely NaN
        df = df.dropna(axis=1, how='all')
        # 2) replace NaN/inf with None to get strict JSON null
        df = df.replace({np.nan: None, np.inf: None, -np.inf: None})
        # 3) round numeric columns
        num_cols = df.select_dtypes(include='number').columns
        if len(num_cols) > 0:
            df.loc[:, num_cols] = df.loc[:, num_cols].round(2)
        # 4) optional select columns
        cols_param = request.args.get('columns')
        if cols_param:
            want = [c.strip() for c in cols_param.split(',') if c.strip()]
            keep = [c for c in want if c in df.columns]
            if keep:
                df = df[keep]

        records = df.to_dict(orient='records')
        cache.set(cache_key, records, ttl=300)
        return Response(json.dumps(records, ensure_ascii=False), mimetype='application/json; charset=utf-8')
    except Exception as e:
        print(f"Lỗi Screener: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/financials')
def api_financials():
    symbol = (request.args.get('symbol') or 'FPT').upper()
    ftype = request.args.get('type', 'income')  # income|balance|cashflow
    period = request.args.get('period', 'quarter')  # not used by current vnstock Finance; kept for compat
    limit = int(request.args.get('limit', 8))
    try:
        from vnstock import Finance
    except Exception:
        Finance = None
    if Finance is None:
        return jsonify({"error": "Finance API khÃ´ng kháº£ dá»¥ng trong vnstock hiá»‡n táº¡i."}), 501
    cache_key = f"financials_{symbol}_{ftype}_{period}_{limit}"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)
    try:
        fin = Finance(symbol)
        df = None
        # Map types to available methods in vnstock 3.2.3
        if ftype in ('income', 'income_statement') and hasattr(fin, 'income_statement'):
            df = fin.income_statement()
        elif ftype in ('balance', 'balance_sheet') and hasattr(fin, 'balance_sheet'):
            df = fin.balance_sheet()
        elif ftype in ('cashflow', 'cashflow_statement') and hasattr(fin, 'cashflow_statement'):
            df = fin.cashflow_statement()
        # Fallback to generic methods if exist
        if df is None and hasattr(fin, 'financials'):
            df = fin.financials(statement=ftype, period=period, limit=limit)
        if df is None and hasattr(fin, 'statement'):
            df = fin.statement(kind=ftype, period=period, limit=limit)
        if df is None or (hasattr(df, 'empty') and df.empty):
            return jsonify([])
        # Limit rows if requested
        if hasattr(df, 'tail'):
            df = df.tail(limit)
        records = df.to_dict(orient='records') if hasattr(df, 'to_dict') else df
        cache.set(cache_key, records, ttl=86400)
        return jsonify(records)
    except Exception as e:
        print(f"Lá»—i Financials cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/ratios')
def api_ratios():
    symbol = (request.args.get('symbol') or 'FPT').upper()
    try:
        from vnstock import Finance
    except Exception:
        Finance = None
    if Finance is None:
        return jsonify({"error": "Finance API khÃ´ng kháº£ dá»¥ng Ä‘á»ƒ láº¥y ratios."}), 501
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
        print(f"Lá»—i Ratios cho {symbol}: {e}")
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
        return jsonify({"error": "News API khÃ´ng kháº£ dá»¥ng trong vnstock hiá»‡n táº¡i."}), 501
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
        print(f"Lá»—i News cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/financials')
def get_financials():
    symbol = request.args.get('symbol', 'ACB').upper()
    statement = request.args.get('statement', 'ratio')
    period = request.args.get('period', 'year')
    source = request.args.get('source', 'VCI')
    include_industry = request.args.get('industry', 'false').lower() == 'true'

    cache_key = f"financials_{symbol}_{statement}_{period}_{source}"
    cached = cache.get(cache_key)
    if cached is not None:
        return jsonify(cached)

    try:
        finance = Finance(symbol=symbol, source=source)
        if statement == 'balance_sheet':
            df = finance.balance_sheet(period=period, dropna=True)
        elif statement == 'income_statement':
            df = finance.income_statement(period=period, dropna=True)
        elif statement == 'cash_flow':
            df = finance.cash_flow(period=period, dropna=True)
        else:
            df = finance.ratio(period=period, dropna=True)

        df.fillna('', inplace=True)
        result = {'data': df.to_dict(orient='records')}

        if statement == 'ratio' and include_industry and industries_df is not None:
            try:
                industry_code = industries_df.loc[symbol]['icb_code4']
                peers = industries_df[industries_df['icb_code4'] == industry_code].index.tolist()
                peers = [p for p in peers if p != symbol][:10]
                peer_ratios = []
                for p in peers:
                    try:
                        peer_df = Finance(symbol=p, source=source).ratio(period=period, dropna=True)
                        if not peer_df.empty:
                            peer_ratios.append(peer_df.iloc[0])
                    except Exception:
                        continue
                if peer_ratios:
                    peer_df_all = pd.DataFrame(peer_ratios)
                    result['industry_averages'] = peer_df_all.mean(numeric_only=True).to_dict()
            except Exception as e:
                result['industry_averages_error'] = str(e)

        cache.set(cache_key, result, ttl=86400)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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


@app.route('/api/industry/list')
def api_industry_list():
    """Danh sách ngành (ICB/industry/sector) nếu có."""
    global industries_df, listing_manager, all_companies_df
    # Đảm bảo dữ liệu listing/industry sẵn sàng
    try:
        if listing_manager is None:
            listing_manager = Listing()
        if industries_df is None:
            tmp = listing_manager.symbols_by_industries()
            tmp.set_index('symbol', inplace=True)
            industries_df = tmp
    except Exception:
        pass
    def _has_letter(s: str) -> bool:
        return any(('A' <= ch <= 'Z') or ('a' <= ch <= 'z') or ('À' <= ch <= 'ỹ') for ch in s)

    def _clean(arr):
        cleaned = []
        for s in arr:
            if not s:
                continue
            st = str(s).strip()
            if not st or st.upper() == 'NAN':
                continue
            # Loại các mã/nhãn thuần số (ví dụ icb_code4 như 9000, 9530...)
            if not _has_letter(st):
                continue
            cleaned.append(st)
        # unique + sort
        return sorted({x for x in cleaned})

    out = []
    try:
        if industries_df is not None:
            cols_map = {c.lower(): c for c in industries_df.columns}
            # Ưu tiên các cột chuẩn
            for c in ['icb_name', 'industry_name', 'industry', 'sector_name']:
                if c in cols_map:
                    real = cols_map[c]
                    ser = industries_df[real].dropna().astype(str)
                    out = _clean(ser.tolist())
                    break
            # Fallback: gom từ mọi cột có chứa từ khóa industry/sector/icb
            if not out:
                cand_cols = [col for col in industries_df.columns if any(k in col.lower() for k in ['industry', 'sector', 'icb'])]
                vals = []
                for col in cand_cols:
                    try:
                        ser = industries_df[col].dropna().astype(str).tolist()
                        vals.extend(ser)
                    except Exception:
                        continue
                out = _clean(vals)
    except Exception:
        out = []
    # As a last resort, thử lôi từ all_companies_df nếu có
    if not out and all_companies_df is not None:
        try:
            cand_cols = [col for col in all_companies_df.columns if any(k in str(col).lower() for k in ['industry', 'sector', 'icb'])]
            vals = []
            for col in cand_cols:
                try:
                    ser = all_companies_df[col].dropna().astype(str).tolist()
                    vals.extend(ser)
                except Exception:
                    continue
            out = _clean(vals)
        except Exception:
            pass
    out = sorted({s for s in out})
    return jsonify({"industries": out})


@app.route('/api/industry/stocks')
def api_industry_stocks():
    """Danh sách mã thuộc một ngành: trả về {code, companyName, floor}."""
    global industries_df, listing_manager, all_companies_df
    name = (request.args.get('industry') or '').strip()
    if not name:
        return jsonify({"data": []})
    try:
        if listing_manager is None:
            listing_manager = Listing()
        if industries_df is None:
            tmp = listing_manager.symbols_by_industries()
            tmp.set_index('symbol', inplace=True)
            industries_df = tmp
        if all_companies_df is None:
            ac = listing_manager.symbols_by_exchange()
            ac.set_index('symbol', inplace=True)
            all_companies_df = ac
    except Exception:
        pass
    items = []
    try:
        if industries_df is not None:
            import unicodedata as _ud
            def _norm(s):
                try:
                    s = ''.join(c for c in _ud.normalize('NFKD', str(s)) if not _ud.combining(c))
                except Exception:
                    s = str(s)
                return s.lower().strip()
            target = _norm(name)
            cols = {c.lower(): c for c in industries_df.columns}
            # Lấy tất cả cột có chứa industry/sector/icb để tăng độ phủ
            cand_keys = [k for k in cols.keys() if any(t in k for t in ['industry','sector','icb'])]
            if not cand_keys:
                cand_keys = list(cols.keys())
            mask = None
            for c in cand_keys:
                real = cols[c]
                series = industries_df[real].astype(str)
                ser_norm = series.map(_norm)
                m = ser_norm == target
                if len(target) > 1:
                    m = m | ser_norm.str.contains(target, regex=False)
                mask = m if mask is None else (mask | m)
            if mask is not None and getattr(mask, 'any', lambda: False)():
                syms = industries_df[mask].index.astype(str).str.upper().tolist()
                for s in syms:
                    rec = {"code": s}
                    if all_companies_df is not None and s in all_companies_df.index:
                        try:
                            rec['companyName'] = all_companies_df.loc[s].get('organ_name') or ''
                            rec['floor'] = all_companies_df.loc[s].get('exchange') or ''
                        except Exception:
                            pass
                    items.append(rec)
    except Exception:
        items = []
    return jsonify({"data": items})


@app.route('/api/industry/lastest')
def api_industry_lastest():
    """Giá hiện tại cho toàn bộ mã thuộc một ngành. Trả về map {SYMB: {...}}"""
    global industries_df, listing_manager, trading_manager
    name = (request.args.get('industry') or '').strip()
    out = {}
    try:
        if listing_manager is None:
            listing_manager = Listing()
        if industries_df is None:
            tmp = listing_manager.symbols_by_industries()
            tmp.set_index('symbol', inplace=True)
            industries_df = tmp
        if trading_manager is None:
            trading_manager = Trading()
    except Exception:
        pass
    try:
        if not name or industries_df is None or trading_manager is None:
            return jsonify({"data": out})
        # Collect symbols for industry
        import unicodedata as _ud
        def _norm(s):
            try:
                s = ''.join(c for c in _ud.normalize('NFKD', str(s)) if not _ud.combining(c))
            except Exception:
                s = str(s)
            return s.lower().strip()
        target = _norm(name)
        cols = {c.lower(): c for c in industries_df.columns}
        cand_keys = [k for k in cols.keys() if any(t in k for t in ['industry','sector','icb'])]
        if not cand_keys:
            cand_keys = list(cols.keys())
        mask = None
        for c in cand_keys:
            real = cols[c]
            ser_norm = industries_df[real].astype(str).map(_norm)
            m = ser_norm == target
            if len(target) > 1:
                m = m | ser_norm.str.contains(target, regex=False)
            mask = m if mask is None else (mask | m)
        if mask is None or (not mask.any()):
            return jsonify({"data": out})
        syms = industries_df[mask].index.astype(str).str.upper().tolist()
        syms = [s for s in syms if s and s.upper() != 'NAN'][:300]
        if not syms:
            return jsonify({"data": out})
        # Try cache first
        cache_key = f"industry_lastest_{target}_{len(syms)}"
        cached = cache.get(cache_key)
        if cached is not None:
            return jsonify({"data": cached})
        # Fetch in chunks
        import math
        frames = []
        for i in range(int(math.ceil(len(syms)/80))):
            part = syms[i*80:(i+1)*80]
            try:
                df = trading_manager.price_board(part)
                if df is not None and not getattr(df, 'empty', True):
                    frames.append(df)
            except Exception:
                df = None
            # Fallback per-symbol if batch failed/empty
            if not frames or (df is None or getattr(df, 'empty', True)):
                for s in part:
                    try:
                        f = trading_manager.price_board([s])
                        if f is not None and not getattr(f, 'empty', True):
                            frames.append(f)
                    except Exception:
                        continue
        if not frames:
            return jsonify({"data": out})
        import pandas as _pd
        try:
            df = _pd.concat(frames)
        except Exception:
            # if any object different shapes, keep first non-empty
            df = None
            for f in frames:
                if f is not None and not getattr(f, 'empty', True):
                    df = f if df is None else _pd.concat([df, f], ignore_index=False)
            if df is None:
                return jsonify({"data": out})
        # Flatten
        if isinstance(df.columns, pd.MultiIndex):
            new_cols = []
            for col in df.columns.values:
                parts = [p for p in col if p]
                parts = [str(p) for p in parts]
                new_cols.append('_'.join(parts))
            df.columns = new_cols
        else:
            df.columns = [str(c) for c in df.columns]
        df = df.reset_index()
        # một số nguồn để ticker ở index -> đổi sang 'symbol'
        if 'symbol' not in df.columns and 'index' in df.columns:
            try:
                df.rename(columns={'index': 'symbol'}, inplace=True)
            except Exception:
                pass
        # Build map
        def pick(row, cands):
            for c in cands:
                if c in row and row[c] is not None and not (isinstance(row[c], float) and np.isnan(row[c])):
                    return row[c]
            return None
        rows = df.to_dict(orient='records')
        # Build case-insensitive key maps to increase robustness
        for r in rows:
            # make a lower->actual map
            key_map = {str(k).lower(): k for k in r.keys()}
            keys_lower = list(key_map.keys())

            def find_key(cands, contains=False):
                for c in cands:
                    lc = c.lower()
                    if lc in key_map:
                        return key_map[lc]
                if contains:
                    for k in keys_lower:
                        if all(seg in k for seg in cands):
                            return key_map[k]
                return None

            # symbol candidates
            sym_key = find_key(['symbol','ticker','listing_symbol','listing_mapping_symbol'])
            if not sym_key:
                # try any key that contains 'ticker' or 'symbol'
                for k in keys_lower:
                    if ('ticker' in k or 'symbol' in k) and key_map[k]:
                        sym_key = key_map[k]
                        break
            sym = r.get(sym_key) if sym_key else r.get('index')
            if not sym:
                continue
            sym = str(sym).upper().strip()
            # must contain at least one letter
            import re as _re
            if not _re.match(r'^(?=.*[A-Z])[A-Z0-9\.]+$', sym):
                continue

            # price-like keys
            price_key = find_key(['match_price','price_match','last_price','last','close'])
            if not price_key:
                # try combined contains rules
                for k in keys_lower:
                    if ('price' in k and ('match' in k or 'last' in k)):
                        price_key = key_map[k]
                        break
            last = r.get(price_key) if price_key else None

            # change absolute
            chg_key = find_key(['change','price_change','diff'])
            if not chg_key:
                for k in keys_lower:
                    if 'change' in k and 'percent' not in k:
                        chg_key = key_map[k]
                        break
            chg = r.get(chg_key) if chg_key else None

            # change percent
            pct_key = find_key(['change_percent','price_change_percent','pct_change'])
            if not pct_key:
                for k in keys_lower:
                    if 'change' in k and 'percent' in k:
                        pct_key = key_map[k]
                        break
            pct = r.get(pct_key) if pct_key else None

            # volume
            vol_key = find_key(['match_volume','volume_match','volume','matched_volume','total_volume'])
            if not vol_key:
                for k in keys_lower:
                    if ('volume' in k or 'qtty' in k) and ('match' in k or 'total' in k or 'matched' in k or k=='volume'):
                        vol_key = key_map[k]
                        break
            vol = r.get(vol_key) if vol_key else None

            out[sym] = {
                'lastPrice': last if last is not None else None,
                'priceChange': chg if chg is not None else None,
                'priceChangePercent': pct if pct is not None else None,
                'matchQtty': vol if vol is not None else None,
            }
        # short cache to reduce repeated heavy calls
        try:
            cache.set(cache_key, out, ttl=15)
        except Exception:
            pass
        return jsonify({"data": out})
    except Exception as e:
        return jsonify({"error": str(e), "data": out}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)



