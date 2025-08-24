# /backend/server.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from vnstock import Listing, Quote, Trading
from datetime import datetime, timedelta
import pandas as pd # <-- THÊM DÒNG NÀY

app = Flask(__name__)
CORS(app)

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

    try:
        quote_requester = Quote(symbol=symbol)
        df = quote_requester.history(start=start_date_str, end=end_date_str, interval=resolution)

        if df.empty:
            print(f"Không tìm thấy dữ liệu cho mã {symbol}.")
            return jsonify([])

        df.dropna(inplace=True)
        df['time'] = df['time'].dt.strftime('%Y-%m-%d')
        
        print(f"Lấy dữ liệu SẠCH thành công cho {symbol}.")
        return jsonify(df.to_dict(orient='records'))

    except Exception as e:
        print(f"Đã xảy ra lỗi khi lấy dữ liệu cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500

# ▼▼▼ THAY ĐỔI TOÀN BỘ HÀM NÀY ▼▼▼
@app.route('/api/market_data')
def get_market_data():
    symbol = request.args.get('symbol', 'VNINDEX').upper()
    if trading_manager is None:
        return jsonify({"error": "Trading manager chưa được khởi tạo."}), 500
    
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
        
        print(f"Lấy dữ liệu thị trường thành công cho {symbol}.")
        return jsonify(result)

    except Exception as e:
        print(f"Lỗi khi lấy dữ liệu thị trường cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500
# ▲▲▲ KẾT THÚC THAY ĐỔI ▲▲▲


if __name__ == '__main__':
    app.run(debug=True, port=5000)
