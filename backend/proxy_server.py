# -*- coding: utf-8 -*-
# Lightweight proxy server exposing the external APIs used by the Excel workbook
# Run:  python backend/proxy_server.py

from flask import Flask, jsonify, request, Response
from datetime import datetime, timedelta

app = Flask(__name__)

try:
    from flask_cors import CORS  # type: ignore

    CORS(app)
except Exception:
    # CORS not critical; frontend can be served from same origin or adjust manually
    pass


@app.route('/api/proxy/vcbs/priceboard', methods=['GET'])
def proxy_vcbs_priceboard():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({
            "error": "Python 'requests' package not available. Install via: pip install requests"
        }), 500

    criteria_id = request.args.get('criteriaId', '-11')  # HOSE:-11, HNX:-12, UPCOM:-13
    selected_stocks = request.args.get('selectedStocks', '')
    market_id = int(request.args.get('marketId', '0'))
    last_seq = int(request.args.get('lastSeq', '0'))
    is_req_tl = request.args.get('isReqTL', 'false').lower() == 'true'
    is_req_mk = request.args.get('isReqMK', 'false').lower() == 'true'
    tl_symbol = request.args.get('tlSymbol', '')
    pth_mkt_id = request.args.get('pthMktId', '')

    url = 'http://priceboard.vcbs.com.vn/PriceBoard/Acc/amw'
    payload = {
        "selectedStocks": selected_stocks,
        "criteriaId": str(criteria_id),
        "marketId": market_id,
        "lastSeq": last_seq,
        "isReqTL": is_req_tl,
        "isReqMK": is_req_mk,
        "tlSymbol": tl_symbol,
        "pthMktId": pth_mkt_id,
    }
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        text = resp.text
        # VCBS often returns JSON with text/html content-type. Try to parse anyway
        rows = []
        raw = None
        try:
            data = resp.json()
            raw = data
        except Exception:
            try:
                import json as _json
                raw = _json.loads(text)
            except Exception:
                raw = text
                data = None
        if isinstance(raw, dict):
            data = raw
        else:
            data = None
        if data and isinstance(data, dict) and 'pb' in data and isinstance(data['pb'], dict):
            # pb.f is an array of JSON strings; parse each element
            f = data['pb'].get('f') or []
            import json as _json
            for item in f:
                if not item:
                    continue
                try:
                    row = _json.loads(item)
                    rows.append(row)
                except Exception:
                    # skip malformed entries
                    pass
        # Return normalized JSON list for frontend consumption; include raw for inspection
        return jsonify({
            'status': resp.status_code,
            'rows': rows,
            'raw': raw,
        }), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 502

# ---------------- VNDirect (finfo + chart) ----------------

@app.route('/api/proxy/vnd/company_profiles', methods=['GET'])
def proxy_vnd_company_profiles():
    """Company profiles by code.
    Query: code=ACB, fields=...
    """
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    code = (request.args.get('code') or 'ACB').upper()
    base = 'https://finfo-api.vndirect.com.vn/v4/company_profiles'
    params = {
        'q': f'code:{code}'
    }
    if 'fields' in request.args:
        params['fields'] = request.args.get('fields')
    else:
        params['fields'] = 'code,companyName,shortName,organName,companyNameEng,floor,industryName,industry,industryEnName,icbName,sectorName,listedDate,taxCode,companyId,type,status'
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(base, params=params, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/vnd/ratios_latest', methods=['GET'])
def proxy_vnd_ratios_latest():
    """Latest ratios for a code with reasonable defaults.
    Query: code=ACB&from=2022-01-01&fields=itemCode,value,reportDate&filter=itemCode:...
    """
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    code = (request.args.get('code') or 'ACB').upper()
    since = request.args.get('from') or '2020-01-01'
    base = 'https://finfo-api.vndirect.com.vn/v4/ratios/latest'
    params = {}
    # default filter list similar to patterns in VBA
    params['filter'] = request.args.get('filter') or (
        'itemCode:51003,51016,51001,51002,51004,57066,51007,51006,51012,51033,51035'
    )
    params['where'] = request.args.get('where') or f'code:{code}~reportDate:gt:{since}'
    params['order'] = request.args.get('order') or 'reportDate'
    params['fields'] = request.args.get('fields') or 'itemCode,value,reportDate'
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(base, params=params, headers=headers, timeout=20)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/vnd/candles', methods=['GET'])
def proxy_vnd_candles():
    """Historical candles (dchart API).
    Query: symbol=VCB&resolution=D&from=unix&to=unix
    """
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    symbol = request.args.get('symbol', 'VCB')
    resolution = request.args.get('resolution', 'D')
    _from = request.args.get('from') or str(int(datetime.utcnow().timestamp()) - 3600 * 24 * 365)
    _to = request.args.get('to') or str(int(datetime.utcnow().timestamp()))
    base = 'https://dchart-api.vndirect.com.vn/dchart/history'
    params = {'symbol': symbol, 'resolution': resolution, 'from': _from, 'to': _to}
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(base, params=params, headers=headers, timeout=20)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ---------------- Vietstock ----------------

@app.route('/api/proxy/vietstock/tradinginfo', methods=['GET'])
def proxy_vietstock_tradinginfo():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    symbol = request.args.get('symbol', 'VCB')
    url = 'https://finance.vietstock.vn/company/tradinginfo'
    params = {'symbol': symbol}
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        'Referer': f'https://finance.vietstock.vn/{symbol}'
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        ct = resp.headers.get('Content-Type', 'application/json')
        return Response(resp.content, status=resp.status_code, content_type=ct)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ---------------- CafeF realtime ----------------

@app.route('/api/proxy/cafef/realtime', methods=['GET'])
def proxy_cafef_realtime():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    center = request.args.get('center', '1')  # 1=HSX, 2=HNX, 9=UPCOM
    url = 'https://banggia.cafef.vn/stockhandler.ashx'
    params = {'center': center}
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://banggia.cafef.vn/'
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        # CafeF sometimes returns text/plain JSON
        ct = resp.headers.get('Content-Type', 'application/json')
        return Response(resp.content, status=resp.status_code, content_type=ct)
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ---------------- VCBS normalized priceboard ----------------

@app.route('/api/proxy/vcbs/priceboard/normalized', methods=['GET'])
def proxy_vcbs_priceboard_normalized():
    """Return normalized rows only (parsed from pb.f)."""
    try:
        import requests  # type: ignore
        import json as _json  # noqa
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    criteria_id = request.args.get('criteriaId', '-11')
    selected_stocks = request.args.get('selectedStocks', '')
    market_id = int(request.args.get('marketId', '0'))
    last_seq = int(request.args.get('lastSeq', '0'))
    is_req_tl = request.args.get('isReqTL', 'false').lower() == 'true'
    is_req_mk = request.args.get('isReqMK', 'false').lower() == 'true'
    tl_symbol = request.args.get('tlSymbol', '')
    pth_mkt_id = request.args.get('pthMktId', '')

    url = 'http://priceboard.vcbs.com.vn/PriceBoard/Acc/amw'
    payload = {
        "selectedStocks": selected_stocks,
        "criteriaId": str(criteria_id),
        "marketId": market_id,
        "lastSeq": last_seq,
        "isReqTL": is_req_tl,
        "isReqMK": is_req_mk,
        "tlSymbol": tl_symbol,
        "pthMktId": pth_mkt_id,
    }
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'User-Agent': 'Mozilla/5.0',
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=10)
        rows = []
        try:
            data = resp.json()
        except Exception:
            import json as _json
            try:
                data = _json.loads(resp.text)
            except Exception:
                data = None
        if isinstance(data, dict) and 'pb' in data and isinstance(data['pb'], dict):
            arr = data['pb'].get('f') or []
            import json as _json
            for item in arr:
                try:
                    rows.append(_json.loads(item))
                except Exception:
                    pass
        return jsonify({'status': resp.status_code, 'rows': rows}), resp.status_code
    except Exception as e:
        return jsonify({"error": str(e)}), 502

@app.route('/api/proxy/vndirect/stocks', methods=['GET'])
def proxy_vndirect_stocks():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({
            "error": "Python 'requests' package not available. Install via: pip install requests"
        }), 500

    base = 'https://api-finfo.vndirect.com.vn/v4/stocks'
    params = dict(request.args)
    if 'q' not in params:
        params['q'] = 'type:IFC,ETF,STOCK~status:LISTED'
    if 'fields' not in params:
        # include multiple possible industry synonyms to maximize compatibility
        params['fields'] = (
            'code,companyName,organName,companyNameEng,shortName,floor,'
            'industryName,industry,industryEnName,icbName,sectorName,'
            'listedDate,taxCode,companyId,type,status'
        )
    if 'size' not in params:
        params['size'] = '3000'
    headers = {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
    }
    try:
        resp = requests.get(base, params=params, headers=headers, timeout=10)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/fpts/company_name', methods=['GET'])
def proxy_fpts_company_name():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({
            "error": "Python 'requests' package not available. Install via: pip install requests"
        }), 500

    url = 'https://liveprice.fpts.com.vn/data.ashx'
    params = {'s': request.args.get('s', 'company_name')}
    headers = {
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        return Response(resp.text, status=resp.status_code, content_type='text/plain; charset=utf-8')
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/vietstock/stocklist', methods=['GET'])
def proxy_vietstock_stocklist():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    url = 'https://finance.vietstock.vn/data/stocklist'
    params = {}
    # default catID 1; allow override
    params['catID'] = request.args.get('catID', '1')
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
        'Referer': 'https://finance.vietstock.vn/'
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/fireant/quotes', methods=['GET'])
def proxy_fireant_quotes():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    symbols = request.args.get('symbols', '')
    if not symbols:
        return jsonify({"error": "Query param 'symbols' is required, e.g. symbols=VCB,VPB,FPT"}), 400
    url = 'https://www.fireant.vn/api/Data/Markets/Quotes'
    params = {'symbols': symbols}
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
        'Referer': 'https://www.fireant.vn/'
    }
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/mbs/stocklist', methods=['GET'])
def proxy_mbs_stocklist():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    url = 'https://mktapi1.mbs.com.vn/pbResfulMarkets/category/securities/list'
    headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
        'Referer': 'http://banggia.mbs.com.vn'
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/ssi/graphql', methods=['POST'])
def proxy_ssi_graphql():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    url = 'https://iboard.ssi.com.vn/gateway/graphql'
    try:
        body = request.get_json(force=True, silent=True) or {}
    except Exception:
        body = {}
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Origin': 'https://iboard.ssi.com.vn',
        'Referer': 'https://iboard.ssi.com.vn/',
        'Accept-Language': 'vi,vi-VN;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
    }
    # Optional: forward cookie (e.g., cf_clearance) if provided
    fwd_cookie = request.headers.get('x-forward-cookie') or request.args.get('cookie')
    if fwd_cookie:
        headers['Cookie'] = fwd_cookie
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=20)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/vcbs/ccqm', methods=['GET'])
def proxy_vcbs_ccqm():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    url = 'http://priceboard.vcbs.com.vn/ccqm/'
    headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        return Response(resp.text, status=resp.status_code, content_type='text/html; charset=utf-8')
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/vcbs/company', methods=['GET'])
def proxy_vcbs_company_profile():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500

    symbol = request.args.get('stocksymbol', 'VCB')
    url = f'https://vcbs.com.vn/vn/Research/Company?stocksymbol={symbol}'
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edge/138.0.0.0',
    }
    try:
        # The VBA uses POST; emulate that
        resp = requests.post(url, headers=headers, timeout=15)
        return Response(resp.text, status=resp.status_code, content_type='text/html; charset=utf-8')
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# --- TVSI (Company Profile: overview, lastest, price history, statistics) ---

TVSI_DASHBOARD = 'https://market-data.tvsi.com.vn/api/v1/Dashboard/'
TVSI_TRADING = 'https://market-data.tvsi.com.vn/api/v1/Trading/'

# simple in-memory cache for industry classification via TVSI
_cache_tvsi_industry = { 'time': None, 'map': None }

def _tvsi_industry_code_to_name():
    # Codes from workbook NganhTVSI mapping observed
    return {
        3500: 'Thực phẩm và Đồ uống',
        8700: 'Dịch vụ tài chính',
        8600: 'Bất động sản',
        2300: 'Xây dựng và Vật liệu',
        500:  'Dầu khí',
        1300: 'Hóa chất',
        5300: 'Dịch vụ bán lẻ',
        3700: 'Đồ dùng cá nhân và gia dụng',
        5500: 'Phương tiện truyền thông',
        3300: 'Ô tô và linh kiện phụ tùng',
        4500: 'Y tế',
        7500: 'Dịch vụ tiện ích',
        5700: 'Du lịch và Giải trí',
        2700: 'Hàng hóa và dịch vụ công nghiệp',
        8300: 'Ngân hàng',
        8500: 'Bảo hiểm',
        6500: 'Viễn thông',
        1700: 'Tài nguyên',
        9500: 'Công nghệ',
    }

def _tvsi_fetch_lastest_for(symbols):
    import requests  # type: ignore
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    data = {}
    if not symbols:
        return data
    def chunks(lst, n):
        for i in range(0, len(lst), n):
            yield lst[i:i+n]
    for batch in chunks(symbols, 60):
        params = {'stockSymbols': ','.join(batch)}
        try:
            resp = requests.get(TVSI_TRADING + 'GetLastestStockInfo', params=params, headers=headers, timeout=20)
            if 'application/json' in resp.headers.get('Content-Type',''):
                js = resp.json()
            else:
                js = None
            if isinstance(js, list):
                for it in js:
                    sym = str(it.get('stockSymbol') or it.get('ticker') or '').upper()
                    if sym:
                        data[sym] = it
            elif isinstance(js, dict):
                sym = str(js.get('stockSymbol') or js.get('ticker') or '').upper()
                if sym:
                    data[sym] = js
        except Exception:
            continue
    return data

def _tvsi_industry_map(force_refresh: bool = False):
    # returns {symbol -> industryCode}
    now = datetime.utcnow()
    if not force_refresh and _cache_tvsi_industry['time'] and _cache_tvsi_industry['map'] and (now - _cache_tvsi_industry['time'] < timedelta(hours=6)):
        return _cache_tvsi_industry['map']
    # build
    items = _vnd_stocks_all()
    symbols = [str(x.get('code')) for x in items if x.get('code')]
    lastest = _tvsi_fetch_lastest_for(symbols)
    mapping = {}
    for sym, it in lastest.items():
        try:
            code = int(it.get('industriesCode')) if it.get('industriesCode') is not None else None
        except Exception:
            code = None
        if code is not None:
            mapping[sym] = code
    _cache_tvsi_industry['time'] = now
    _cache_tvsi_industry['map'] = mapping
    return mapping

def _industry_name_to_codes(name: str):
    # map display name to set of possible TVSI industry codes
    import unicodedata
    def norm(s: str) -> str:
        try:
            return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c)).lower().strip()
        except Exception:
            return s.lower().strip()
    n = norm(name)
    code_to_name = _tvsi_industry_code_to_name()
    codes = {code for code, nm in code_to_name.items() if norm(nm) == n or n in norm(nm) or norm(nm) in n}
    syns = _synonyms(name)
    for s in syns:
        codes.update({code for code, nm in code_to_name.items() if norm(nm) == norm(s) or norm(s) in norm(nm) or norm(nm) in norm(s)})
    return codes

@app.route('/api/proxy/tvsi/overview', methods=['GET'])
def proxy_tvsi_overview():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500
    symbol = request.args.get('symbol', 'ACB')
    url = TVSI_DASHBOARD + 'GetListCompanyOverView'
    params = {'stockSymbol': symbol}
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


# ---- Industry utilities (grouping via VNDirect + TVSI lastest) ----

def _vnd_stocks_all():
    import requests  # type: ignore
    base = 'https://api-finfo.vndirect.com.vn/v4/stocks'
    params = {
        'q': 'type:IFC,ETF,STOCK~status:LISTED',
        'size': '3000',
        'fields': (
            'code,companyName,shortName,floor,industryName,industry,industryEnName,icbName,'
            'sectorName,listedDate,type,status'
        )
    }
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    resp = requests.get(base, params=params, headers=headers, timeout=15)
    data = resp.json()
    return data.get('data', []) if isinstance(data, dict) else []


def _get_industry_value(item):
    for k in ('industryName', 'industry', 'icbName', 'sectorName', 'industryEnName'):
        v = item.get(k)
        if v:
            return str(v)
    return ''

def _synonyms(name: str):
    n = name.strip().lower()
    try:
        import unicodedata
        n = ''.join(c for c in unicodedata.normalize('NFKD', n) if not unicodedata.combining(c))
    except Exception:
        pass
    n = n.replace('-', ' ').replace('/', ' ').replace('  ', ' ').strip()
    # Map common Vietnamese → ICB English buckets and keywords
    mapping = {
        'ngan hang': ['bank', 'banking', 'ngan hang', 'financials', 'finance'],
        'bao hiem': ['insurance', 'bao hiem', 'financials', 'finance'],
        'dich vu tai chinh': ['financials', 'finance', 'securities', 'chung khoan', 'taichinh', 'investment'],
        'bat dong san': ['real estate', 'bat dong san'],
        'xay dung va vat lieu': ['materials', 'construction', 'building', 'vat lieu', 'xay dung'],
        'dau khi': ['energy', 'oil', 'gas', 'dau khi'],
        'hoa chat': ['materials', 'chemicals', 'hoa chat'],
        'dich vu ban le': ['consumer discretionary', 'retail', 'ban le'],
        'do dung ca nhan va gia dung': ['consumer discretionary', 'household', 'personal products', 'consumer services'],
        'phuong tien truyen thong': ['communication services', 'media', 'truyen thong'],
        'o to va linh kien phu tung': ['consumer discretionary', 'automobiles', 'auto components'],
        'y te': ['health care', 'y te', 'healthcare'],
        'dich vu tien ich': ['utilities', 'dien', 'nuoc', 'gas', 'utilities'],
        'du lich va giai tri': ['consumer discretionary', 'leisure', 'travel', 'giai tri'],
        'hang hoa va dich vu cong nghiep': ['industrials', 'cong nghiep', 'industrial services'],
        'vien thong': ['communication services', 'telecommunications', 'telecom'],
        'tai nguyen': ['materials', 'resources', 'tai nguyen'],
        'cong nghe': ['information technology', 'technology', 'cong nghe'],
        'thuc pham va do uong': ['consumer staples', 'food', 'beverages', 'do uong'],
    }
    return mapping.get(n, [n])


@app.route('/api/industry/list', methods=['GET'])
def industry_list():
    try:
        items = _vnd_stocks_all()
        vals = sorted({ _get_industry_value(x) for x in items if _get_industry_value(x) })
        if not vals:
            # Fallback: TVSI preset (from workbook mapping)
            vals = [
                'Thực phẩm và Đồ uống', 'Dịch vụ tài chính', 'Bất động sản', 'Xây dựng và Vật liệu',
                'Dầu khí', 'Hóa chất', 'Dịch vụ bán lẻ', 'Đồ dùng cá nhân và gia dụng',
                'Phương tiện truyền thông', 'Ô tô và linh kiện phụ tùng', 'Y tế',
                'Dịch vụ tiện ích', 'Du lịch và Giải trí', 'Hàng hóa và dịch vụ công nghiệp',
                'Ngân hàng', 'Bảo hiểm', 'Viễn thông', 'Tài nguyên', 'Công nghệ'
            ]
        return jsonify({'industries': vals})
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/industry/stocks', methods=['GET'])
def industry_stocks():
    name = (request.args.get('industry') or '').strip()
    if not name:
        return jsonify({'error': "Missing 'industry'"}), 400
    try:
        items = _vnd_stocks_all()
        codes = _industry_name_to_codes(name)
        if not codes:
            return jsonify({'industry': name, 'count': 0, 'data': []})
        ind_map = _tvsi_industry_map()
        picks = [x for x in items if ind_map.get(str(x.get('code')).upper()) in codes]
        return jsonify({'industry': name, 'count': len(picks), 'data': picks})
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/industry/lastest', methods=['GET'])
def industry_lastest():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500
    name = (request.args.get('industry') or '').strip()
    if not name:
        return jsonify({'error': "Missing 'industry'"}), 400
    try:
        def _norm(s: str) -> str:
            try:
                import unicodedata
                s2 = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
            except Exception:
                s2 = s
            return s2.lower().strip()
        items = _vnd_stocks_all()
        codes = _industry_name_to_codes(name)
        ind_map = _tvsi_industry_map()
        targets = [str(x.get('code')) for x in items if ind_map.get(str(x.get('code')).upper()) in codes]
        # Chunk to avoid very long query string
        def chunks(lst, n):
            for i in range(0, len(lst), n):
                yield lst[i:i+n]
        results = {}
        headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        for batch in chunks(targets, 60):
            params = {'stockSymbols': ','.join(batch)}
            resp = requests.get(TVSI_TRADING + 'GetLastestStockInfo', params=params, headers=headers, timeout=15)
            try:
                data = resp.json() if 'application/json' in resp.headers.get('Content-Type','') else {}
            except Exception:
                data = {}
            if isinstance(data, list):
                for it in data:
                    sym = str(it.get('stockSymbol') or it.get('ticker') or '').upper()
                    if sym:
                        results[sym] = it
            elif isinstance(data, dict):
                sym = str(data.get('stockSymbol') or data.get('ticker') or '').upper()
                if sym:
                    results[sym] = data
        return jsonify({'industry': name, 'count': len(targets), 'data': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 502


@app.route('/api/proxy/tvsi/lastest', methods=['GET'])
def proxy_tvsi_lastest():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500
    symbols = request.args.get('symbols') or request.args.get('symbol') or 'ACB'
    url = TVSI_TRADING + 'GetLastestStockInfo'
    params = {'stockSymbols': symbols}
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/tvsi/pricehistory', methods=['GET'])
def proxy_tvsi_pricehistory():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500
    symbol = request.args.get('symbol', 'ACB')
    page_size = request.args.get('pageSize', '20')
    page_index = request.args.get('pageIndex', '1')
    date_from = request.args.get('dateFrom')
    date_to = request.args.get('dateTo')
    filter_ = request.args.get('filter', 'day')
    from datetime import datetime, timedelta
    if not date_to:
        date_to = datetime.utcnow().strftime('%Y-%m-%d')
    if not date_from:
        date_from = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
    url = TVSI_DASHBOARD + 'GetListPriceHistory'
    params = {
        'stockSymbol': symbol,
        'pageSize': page_size,
        'pageIndex': page_index,
        'dateFrom': date_from,
        'dateTo': date_to,
        'filter': filter_,
    }
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


@app.route('/api/proxy/tvsi/statistic', methods=['GET'])
def proxy_tvsi_statistic():
    try:
        import requests  # type: ignore
    except Exception:
        return jsonify({"error": "Python 'requests' package not available. Install via: pip install requests"}), 500
    symbol = request.args.get('symbol', 'ACB')
    page_size = request.args.get('pageSize', '20')
    page_index = request.args.get('pageIndex', '1')
    date_from = request.args.get('dateFrom')
    date_to = request.args.get('dateTo')
    filter_ = request.args.get('filter', 'day')
    from datetime import datetime, timedelta
    if not date_to:
        date_to = datetime.utcnow().strftime('%Y-%m-%d')
    if not date_from:
        date_from = (datetime.utcnow() - timedelta(days=30)).strftime('%Y-%m-%d')
    url = TVSI_DASHBOARD + 'GetListStatisticTrading'
    params = {
        'stockSymbol': symbol,
        'pageSize': page_size,
        'pageIndex': page_index,
        'dateFrom': date_from,
        'dateTo': date_to,
        'filter': filter_,
    }
    headers = {'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0'}
    try:
        resp = requests.get(url, params=params, headers=headers, timeout=15)
        return Response(resp.content, status=resp.status_code, content_type=resp.headers.get('Content-Type', 'application/json'))
    except Exception as e:
        return jsonify({"error": str(e)}), 502


if __name__ == '__main__':
    # Default to localhost:5050 to not conflict with any other server
    app.run(host='127.0.0.1', port=5050, debug=True)
