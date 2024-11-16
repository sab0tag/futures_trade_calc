// Handle form submission for calculator
document.getElementById('calcForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const currentPrice = parseFloat(document.getElementById('current_price').value);
    const entryPrice = parseFloat(document.getElementById('entry_price').value);
    const leverage = parseFloat(document.getElementById('leverage').value);
    const positionSize = parseFloat(document.getElementById('position_size').value);
    const riskPercent = parseFloat(document.getElementById('risk_percent').value);

    // Validate inputs
    if (isNaN(currentPrice) || isNaN(entryPrice) || isNaN(leverage) || isNaN(positionSize) || isNaN(riskPercent)) {
        alert('Please fill in all fields with valid values.');
        return;
    }

    // Function to determine trade type (Long or Short) based on entry price and current price
    function getTradeType(entryPrice, currentPrice) {
        return entryPrice < currentPrice ? "Long" : "Short";
    }

    // Fetch user-calculated values
    fetch('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            current_price: currentPrice,
            entry_price: entryPrice,
            leverage: leverage,
            position_size: positionSize,
            risk_percent: riskPercent
        }),
    })
    .then(response => response.json())
    .then(data => {
        // Check if calculation is successful
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }

        // Determine trade type (Long or Short) for the original values
        const tradeType = getTradeType(entryPrice, currentPrice);

        // Display user calculations
        document.getElementById('calcResults').innerHTML = `
            <h6>Calculation Results</h6>
            <p>Stop Loss Price: ${data.stop_loss_price} USD</p>
            <p>Take Profit Price: ${data.take_profit_price} USD</p>
            <p>Risk Amount: ${data.risk_amount} USD</p>
            <p>Reward Amount: ${data.reward_amount} USD</p>
            <p>Distance to Stop Loss: ${data.distance_to_stop_loss} USD</p>
            <p>Trade Type: ${tradeType}</p>  <!-- Added Trade Type (Long/Short) -->
        `;

        // Calculate suggested values (example logic: reduce risk by 25%)
        const suggestedRiskPercent = riskPercent * 0.75;
        const suggestedLeverage = Math.min(leverage, 10); // Limit leverage to 10x

        fetch('/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                current_price: currentPrice,
                entry_price: entryPrice,
                leverage: suggestedLeverage,
                position_size: positionSize,
                risk_percent: suggestedRiskPercent,
            }),
        })
        .then(response => response.json())
        .then(suggestions => {
            // Check if suggestion calculation is successful
            if (suggestions.error) {
                alert('Error: ' + suggestions.error);
                return;
            }

            // Determine trade type (Long or Short) for the suggested values
            const suggestedTradeType = getTradeType(entryPrice, currentPrice);

            // Display advice-based results
            document.getElementById('adviceResults').innerHTML = `
                <h6>Suggested Parameters</h6>
                <p>Stop Loss Price: ${suggestions.stop_loss_price} USD</p>
                <p>Take Profit Price: ${suggestions.take_profit_price} USD</p>
                <p>Risk Amount: ${suggestions.risk_amount} USD</p>
                <p>Reward Amount: ${suggestions.reward_amount} USD</p>
                <p>Distance to Stop Loss: ${suggestions.distance_to_stop_loss} USD</p>
                <p>Trade Type: ${suggestedTradeType}</p>  <!-- Added Suggested Trade Type (Long/Short) -->
            `;
        })
        .catch(error => console.error('Error fetching suggested values:', error));
    })
    .catch(error => console.error('Error calculating:', error));
});

// Fetch and display top trading pairs
window.onload = function () {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            console.log('Received data:', data);

            // Проверка на наличие ошибки в ответе
            if (data.error) {
                console.error('Error from server:', data.error);
                alert('Error: ' + data.error);
                return;
            }

            // Проверка, что данные являются массивом
            if (!Array.isArray(data)) {
                console.error('Expected pairs to be an array, but got:', data);
                return;
            }

            // Get the container for pairs
            const container = document.getElementById('pairs-container');

            // Clear any existing content
            container.innerHTML = '';

            // Loop through the received pairs and create cards
            data.forEach(pair => {
                const card = document.createElement('div');
                card.classList.add('col-md-4');
                card.innerHTML = `
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${pair.symbol}</h5>
                            <p class="card-text">Current Price: ${pair.current_price} USDT</p>
                            <p class="card-text">Volume: ${pair.volume}</p>
                            <p class="card-text">24h Price Change: ${pair.price_change_24h}%</p>
                            <p class="card-text">Spread: ${pair.spread}%</p>
                            <p class="card-text">Volatility: ${pair.volatility}%</p>
                            <p class="card-text">High Price: ${pair.high_price} USDT</p>
                            <p class="card-text">Low Price: ${pair.low_price} USDT</p>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => console.error('Error fetching data:', error));
};
