# /backend/server.py

from flask import Flask, jsonify, request
from flask_cors import CORS
from vnstock import Quote
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

@app.route('/api/history')
def get_history():
    symbol = request.args.get('symbol', 'VND')
    resolution = request.args.get('resolution', '1D')
    
    end_date_str = request.args.get('to', datetime.now().strftime('%Y-%m-%d'))
    default_start_date = (datetime.strptime(end_date_str, '%Y-%m-%d') - timedelta(days=180)).strftime('%Y-%m-%d')
    start_date_str = request.args.get('from', default_start_date)

    print(f"Đang lấy dữ liệu cho {symbol} từ {start_date_str} đến {end_date_str}...")

    try:
        quote = Quote(symbol=symbol)
        df = quote.history(start=start_date_str, end=end_date_str, interval=resolution)

        if df.empty:
            print(f"Không tìm thấy dữ liệu cho mã {symbol}.")
            return jsonify([])

        # <<< BẮT ĐẦU THAY ĐỔI >>>
        # BƯỚC QUAN TRỌNG: Loại bỏ bất kỳ dòng nào có dữ liệu bị thiếu (NaN/Null)
        df.dropna(inplace=True)
        # <<< KẾT THÚC THAY ĐỔI >>>

        df['time'] = df['time'].dt.strftime('%Y-%m-%d')
        
        print(f"Lấy dữ liệu SẠCH thành công cho {symbol}.")
        return jsonify(df.to_dict(orient='records'))

    except Exception as e:
        print(f"Đã xảy ra lỗi khi lấy dữ liệu cho {symbol}: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)