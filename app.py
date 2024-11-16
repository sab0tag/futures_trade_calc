from flask import Flask, render_template, jsonify, request
from binance.client import Client
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Binance API settings
API_KEY = os.getenv('BINANCE_API_KEY')  # Enter your API key
API_SECRET = os.getenv('BINANCE_API_SECRET')  # Enter your secret key

# Binance client connection
client = Client(API_KEY, API_SECRET)


@app.route('/')
def index():
    """Main page."""
    return render_template('index.html')


@app.route('/data', methods=['GET'])
def get_data():
    """Retrieve trading pairs with high volume and calculate additional metrics."""
    try:
        # Get 24-hour ticker data for all pairs
        tickers = client.get_ticker()

        # Filter pairs where the second part is 'USDT'
        usdt_pairs = []
        for ticker in tickers:
            if 'USDT' in ticker['symbol']:
                last_price = float(ticker['lastPrice'])
                if last_price == 0:
                    continue  # Skip pairs with a last price of zero to avoid division by zero
                high_price = float(ticker['highPrice'])
                low_price = float(ticker['lowPrice'])
                ask_price = float(ticker['askPrice'])
                bid_price = float(ticker['bidPrice'])
                volume = float(ticker['quoteVolume'])
                price_change_24h = float(ticker['priceChangePercent'])
                spread = round(abs(ask_price - bid_price) / last_price * 100, 2)
                volatility = round(abs(high_price - low_price) / last_price * 100, 2)


                usdt_pairs.append({
                    'symbol': ticker['symbol'],
                    'current_price': last_price,
                    'volume': volume,
                    'price_change_24h': price_change_24h,
                    'spread': spread,
                    'high_price': high_price,
                    'low_price': low_price,
                    'volatility': volatility
                })

        # Sort by volume and select the top 10
        sorted_pairs = sorted(usdt_pairs, key=lambda x: x['volume'], reverse=True)[:20]

        return jsonify(sorted_pairs)
    except Exception as e:
        print(f"Error fetching data: {str(e)}")  # Log the error
        return jsonify({'error': str(e)}), 500


@app.route('/calculate', methods=['POST'])
def calculate():
    """Calculate trading parameters based on input data."""
    data = request.json
    try:
        # Extract data from the request
        entry_price = float(data['entry_price'])
        leverage = float(data['leverage'])
        position_size = float(data['position_size'])
        risk_percent = float(data['risk_percent'])
        current_price = float(data['current_price'])

        # Calculate parameters
        risk_amount = (position_size * risk_percent) / 100
        stop_loss_price = entry_price - (risk_amount / (position_size * leverage))
        take_profit_price = entry_price + (2 * (entry_price - stop_loss_price))  # 2R Reward
        reward_amount = (take_profit_price - entry_price) * position_size * leverage
        distance_to_stop_loss = abs(entry_price - stop_loss_price)

        # Return results
        return jsonify({
            'stop_loss_price': round(stop_loss_price, 5),
            'take_profit_price': round(take_profit_price, 5),
            'risk_amount': round(risk_amount, 5),
            'reward_amount': round(reward_amount, 5),
            'distance_to_stop_loss': round(distance_to_stop_loss, 5),
        })
    except (ValueError, KeyError) as e:
        return jsonify({'error': 'Invalid input or missing data: ' + str(e)}), 400


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8282)
