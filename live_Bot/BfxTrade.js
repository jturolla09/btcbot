const request = require("request");
const BFX = require('bitfinex-api-node');

const bfx = new BFX({

  ws: {
    autoReconnect: true,
    seqAudit: true,
    packetWDDelay: 10 * 1000
  }
});

const bws = bfx.ws(1);

function BfxTrade(pairs){
	this.initAmount = 100;
	this.reserve={};
	this.prices={};

	bws.on('open', function(){
		for(var pair of pairs){
			bws.subscribeTicker("t"+pair);
		}
	});

	bws.open();
	setInterval(function(){
		console.log("Restarting websockets");
		bws.close();
		bws.open();
	}, 2*60*60*1000);
}

BfxTrade.prototype.getPrices = function(){
	var self = this;
	bws.on('ticker', function(pair, data){
		//console.log(pair, data);
		if(!self.prices.hasOwnProperty(pair)){
			self.prices[pair] = {lastPrice: -Infinity,
								highPrice: -Infinity,
								lowPrice: Infinity}
		};

		self.prices[pair]['lastPrice'] = data['lastPrice'];
		if(data['lastPrice'] > self.prices[pair]['highPrice']){
			self.prices[pair]['highPrice'] = data['lastPrice'];
		};
		if(data['lastPrice'] < self.prices[pair]['lowPrice']){
			self.prices[pair]['lowPrice'] = data['lastPrice'];
		};

		//console.log(self.prices);
	});
}

BfxTrade.prototype.resetPrices = function(pair){
	this.prices[pair]['highPrice'] = -Infinity;
	this.prices[pair]['lowPrice'] = Infinity;
}

BfxTrade.prototype.testTrade = function(pair, price, amount, type, action, callback){
	switch(type){
		case 'buy':
			if(action == 'long'){
				//this.initAmount -= 1.002* price* amount;
				this.initAmount -= 1.002* amount;
				//console.log(this.initAmount);
			}else{
				//this.initAmount += 0.998*((2*this.reserve[pair]) - price*amount);
				this.initAmount += 0.998*(amount/price) - (this.reserve[pair]*0.001);
			}

			return callback();
		case 'sell':
			if(action == 'long'){
				this.initAmount += 0.998*price*amount;
			}else{
				this.reserve[pair] = amount;
				this.initAmount -= 1.002*this.reserve[pair];
			}

			return callback();
	}
}

BfxTrade.prototype.getHistData = function(pair, callback){
	var currDate = Date.now()/1000;
	var startDate = (3600 - currDate%3600 + currDate - 301*3600)*1000;
	var url = 'https://api.bitfinex.com/v2/candles/trade:1h:t'+pair+'/hist?sort=1&limit=300&start='+startDate;

	request({url: url, method: "GET", timeout: 15000}, function(err, response, body){
		if(!err){
			return callback(pair, JSON.parse(body));
		}else{
			console.log(err.toString());
		}
	});
}

bws.on('error', console.error);
module.exports = BfxTrade;