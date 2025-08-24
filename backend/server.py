# /backend/server.py

from flask import Flask, jsonify, request
from flask_cors import CORS
# ▼▼▼ THAY ĐỔI DÒNG NÀY ▼▼▼
from vnstock import Listing, Quote
# ▲▲▲ KẾT THÚC THAY ĐỔI ▲▲▲
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# ▼▼▼ THAY ĐỔI KHỐI NÀY ▼▼▼
print("Đang tải danh sách công ty...")
try:
    # 1. Khởi tạo đối tượng Listing
    listing_manager = Listing()
    # 2. Gọi phương thức để lấy danh sách công ty
    all_companies_df = listing_manager.symbols_by_exchange()
    # 3. Đặt 'symbol' (thay vì 'ticker') làm chỉ mục (index)
    all_companies_df.set_index('symbol', inplace=True)
    print("Tải danh sách công ty thành công.")
except Exception as e:
    print(f"Lỗi khi tải danh sách công ty: {e}")
    all_companies_df = None
# ▲▲▲ KẾT THÚC THAY ĐỔI ▲▲▲


@app.route('/api/company_info')
def get_company_info():
    symbol = request.args.get('symbol', 'VND').upper() # Chuyển mã thành chữ hoa
    if all_companies_df is None:
        return jsonify({"error": "Danh sách công ty chưa được tải."}), 500

    try:
        if symbol in all_companies_df.index:
            # ▼▼▼ THAY ĐỔI TÊN CỘT ▼▼▼
            # Tên cột chính xác là 'organ_name' (chữ thường)
            company_name = all_companies_df.loc[symbol]['organ_name']
            # ▲▲▲ KẾT THÚC THAY ĐỔI ▲▲▲
            return jsonify({"fullName": company_name})
        else:
            return jsonify({"fullName": f"Không tìm thấy tên cho mã {symbol}"})
    except Exception as e:
        print(f"Lỗi khi tra cứu thông tin cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/history')
def get_history():
    # Chuyển mã thành chữ hoa để đảm bảo tính nhất quán
    symbol = request.args.get('symbol', 'VND').upper()
    resolution = request.args.get('resolution', '1D')
    
    end_date_str = request.args.get('to', datetime.now().strftime('%Y-%m-%d'))
    default_start_date = (datetime.strptime(end_date_str, '%Y-%m-%d') - timedelta(days=365*5)).strftime('%Y-%m-%d') # Tải 5 năm dữ liệu
    start_date_str = request.args.get('from', default_start_date)

    print(f"Đang lấy dữ liệu cho {symbol} từ {start_date_str} đến {end_date_str}...")

    try:
        # Sử dụng đối tượng Quote riêng cho mỗi request để đảm bảo an toàn luồng
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


if __name__ == '__main__':
    app.run(debug=True, port=5000)