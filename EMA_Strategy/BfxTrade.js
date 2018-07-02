const request = require("request");

function BfxTrade(){
	this.initAmount = 100;
	this.reserve={};
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
module.exports = BfxTrade;