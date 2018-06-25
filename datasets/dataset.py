import requests
import time

start_date = 1483228800 * 1000 #Jan 01 2017
pairs = ['LTCBTC', 'IOTBTC', 'ZRXBTC', 'BTGBTC', 'BFTBTC', 'NEOBTC', 'BATBTC', 'DADBTC', 'OMGBTC']
timeframes = ['1m']
interval = 0;

for timeframe in timeframes:
    if timeframe == '1m':
        interval = 1 * 60
    elif timeframe == '5m':
        interval = 5 * 60
    elif timeframe == '30m':
        interval = 30 * 60
    elif timeframe == '1h':
        interval = 60 * 60
    elif timeframe == '6h':
        interval == 6 * 60 * 60
    else:
        interval == 12 * 60 * 60
    for pair in pairs:
        start_date = 1483228800 * 1000
        print("Starting Pair: " + pair + " at: " + timeframe + " timeframe")
        for _ in range(10000):
            final_data = []
            url = 'https://api.bitfinex.com/v2/candles/trade:' + timeframe + ':t' + pair + '/hist?sort=1&limit=1000&start=' + str(start_date)

            r = requests.get(url)

            temp_data = r.json()
            final_data = final_data + temp_data

            start_date = temp_data[len(temp_data)-1][0] + (interval * 1000)

            print(time.ctime() + " " + str(len(temp_data)))
            time.sleep(8)
            if len(temp_data) < 1000:
            	break

        with open ('BFX_' + pair + '_' + timeframe + '.json', 'w') as f:
            f.write(str(final_data))

        print("Saved Pair: " + pair + " at: " + timeframe + " timeframe")
        print(" ")
