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
module.exports = BfxTrade;