import requests
import time

start_date = 1483228800 * 1000 #Jan 01 2017
# pairs = ['BATBTC', 'BCHBTC', 'BFTBTC', 'BTGBTC', 'DADBTC', 'DSHBTC', 'EOSBTC', 'ETCBTC', 'ETHBTC', 'IOTBTC', 'LTCBTC', 'NEOBTC', 'OMGBTC', 'TRXBTC', 'XMRBTC', 'XRPBTC', 'ZECBTC', 'ZRXBTC']
pairs = ['BATBTC', 'BCHBTC', 'BFTBTC', 'BTGBTC', 'DADBTC', 'DSHBTC', 'EOSBTC', 'ETCBTC', 'ETHBTC', 'IOTBTC', 'LTCBTC']
timeframes = ['5m', '30m', '1h', '6h', '12h']
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
        final_data = []
        print("Starting Pair: " + pair + " at: " + timeframe + " timeframe")
        for _ in range(10000):
            url = 'https://api.bitfinex.com/v2/candles/trade:' + timeframe + ':t' + pair + '/hist?sort=1&limit=1000&start=' + str(start_date)

            r = requests.get(url)

            temp_data = r.json()

            try:
                start_date = temp_data[len(temp_data)-1][0] + (interval * 1000)
                print(time.ctime() + " " + str(len(temp_data)))
                final_data = final_data + temp_data
                # time.sleep(6)
                if len(temp_data) < 1000:
                    break

            except TypeError:
                print("Bitfinex API sais: YOU SHALL NOT PASS!")
                time.sleep(20)


        with open ('BFX_' + pair + '_' + timeframe + '.json', 'w') as f:
            f.write(str(final_data))

        print("Saved Pair: " + pair + " at: " + timeframe + " timeframe")
        print(" ")
