fs = require('fs');
const SMA = require('technicalindicators').SMA;
const ADX = require('technicalindicators').ADX;
const ATR = require('technicalindicators').ATR;
const EMA = require('technicalindicators').EMA
const pairsArray = ['BCHBTC', 'BTGBTC', 'DSHBTC', 'EOSBTC', 'ETHBTC', 'IOTBTC', 'NEOBTC', 'OMGBTC', 'TRXBTC', 'XRPBTC'];
const BFXTrade = require('./BfxTrade');

var bfx = new BFXTrade(pairsArray);
var pairs = {};

const timeinSec = 3600000;

const accountRiskCoeff = 0.05;
const maPeriods = 50;
const adxPeriods = 15;
const trendStrength = 1;
const atrPeriods = 18;
const EMA10 = 8;
const EMA21 = 25;

var openedPositions = 0;
var success = 0;
var loss = 0;

// marketData returns:
// 0 = timestamp
// 1 = open price
// 2 = close price
// 3 = high price
// 4 = low price
// 5 = volume

function Manager(){

  for(pair of pairsArray){
    pairs[pair]={
      maValue: 0,
      prevMaValue: 0,
      prevClose: 0,
      adxValue: 0,
      atrValue: 0,
      long: false,
      short: false,
      stopLossPrice: 0,
      entryAmount: 0,
      entryPrice: 0,
      success: 0,
      loss: 0,
      profit: [],
      profitPct: [],
      kelly: 0.25,
      coinAmount: 0,
      creditAmount: 0,
      EMA10Value: 0,
      EMA21Value:0,
      prev10Value: 0,
      prev21Value:0
    } 
    
  }

  for(pair in pairs){
    bfx.getHistData(pair, function(resppair, data){
      var carray = [];
      var harray = [];
      var larray = [];

      for(var d of data){
        carray.push(d[2]);
        harray.push(d[3]);
        larray.push(d[4]);
      }

      pairs[resppair]['ema10'] = new SMA({period: EMA10, values:carray});
      pairs[resppair]['ema21'] = new SMA({period: EMA21, values:carray});
      pairs[resppair]['adx'] = new ADX({period: adxPeriods, close:carray, high:harray, low:larray});
      pairs[resppair]['atr'] = new ATR({period: atrPeriods, close:carray, high:harray, low:larray});

    });
  }

}


Manager.prototype.runBot = function(){

  console.log("Initializing BOT...");
  bfx.getPrices();

  var delay = timeinSec - Date.now()%timeinSec;
  console.log("trading starts in ", delay/60000, " minutes");

  setTimeout(function(){
    for(var pair in pairs){
      updateIndicators(pair, bfx.prices);
      bfx.resetPrices(pair);
    }
    setInterval(function(){
      for(var pair in pairs){
        updateIndicators(pair, bfx.prices);
        bfx.resetPrices(pair);
      }
    }, timeinSec);
    setInterval(function(){
      for(var pair in pairs){
        findTradeOpportunity(pair, bfx.prices[pair]['lastPrice']);
      }
    }, 20000)


  }, delay);

}

function updateIndicators(pair, price){
  //pairs[pair]['prevMaValue'] = pairs[pair]['maValue'];
  pairs[pair]['prev10Value'] = pairs[pair]['EMA10Value'];
  pairs[pair]['prev21Value'] = pairs[pair]['EMA21Value'];
  //pairs[pair]['maValue'] = pairs[pair]['ma'].nextValue(price[2]);
  pairs[pair]['EMA10Value'] = pairs[pair]['ema10'].nextValue(price[pair]['lastPrice']);
  pairs[pair]['EMA21Value'] = pairs[pair]['ema21'].nextValue(price[pair]['lastPrice']);

  pairs[pair]['adxValue'] = pairs[pair]['adx'].nextValue({close: price[pair]['lastPrice'] , high: price[pair]['highPrice'],
    low: price[pair]['lowPrice']});
  pairs[pair]['atrValue'] = pairs[pair]['atr'].nextValue({close: price[pair]['lastPrice'] , high: price[pair]['highPrice'],
    low: price[pair]['lowPrice']});

  pairs[pair]['prevClose'] = price[pair]['lastPrice'];
}

//Aparentemente essa e a funcao que define a estrategia do BOT
function findTradeOpportunity(pair, close){
  // Se eu nao tenho ordem aberta:
  if(!pairs[pair]['long'] && !pairs[pair]['short']){
    if(pairs[pair]['prev10Value'] <= pairs[pair]['prev21Value'] 
      && pairs[pair]['EMA10Value'] > pairs[pair]['EMA21Value'] && pairs[pair]['adxValue'].adx > trendStrength){
      openLongPosition(pair, close);
    } else if(pairs[pair]['prev10Value'] >= pairs[pair]['prev21Value'] 
      && pairs[pair]['EMA10Value'] < pairs[pair]['EMA21Value'] && pairs[pair]['adxValue'].adx > trendStrength){
      openShortPosition(pair, close);
    }

  //se eu tenho ordem aberta de LONG
  }else if(pairs[pair]['long']){

      if(pairs[pair]['prev10Value'] >= pairs[pair]['prev21Value'] 
      && pairs[pair]['EMA10Value'] < pairs[pair]['EMA21Value'] && close >= 1.004*pairs[pair]['entryPrice']){
        success++;
        pairs[pair]['success']++;
        closeLongPosition(pair, close);
        //openShortPosition(pair, close);

      //StopLoss
      }else if(close <= pairs[pair]['stopLossPrice']){
        loss++;
        pairs[pair]['loss']++;
        closeLongPosition(pair, pairs[pair]['stopLossPrice']);

      }

  //se eu tenho ordem aberta de SHORT
  }else if(pairs[pair]['short']){

      if(pairs[pair]['prev10Value'] <= pairs[pair]['prev21Value'] 
      && pairs[pair]['EMA10Value'] > pairs[pair]['EMA21Value'] && close <= 0.996*pairs[pair]['entryPrice']){
        success++;
        pairs[pair]['success']++;
        closeShortPosition(pair, close);
        //openLongPosition(pair, close);

      //Stoploss
      }else if(close >= pairs[pair]['stopLossPrice']){
        loss++;
        pairs[pair]['loss']++;
        closeShortPosition(pair, pairs[pair]['stopLossPrice']);

      }

  }

}

//Position Manager
//Ordens de acao, gostaria de bota-las em outro arquivo
function openLongPosition(pair, close){
  pairs[pair]['stopLossPrice'] = close - pairs[pair]['atrValue']*2;
  pairs[pair]['entryAmount'] = getPositionSize(pair, close);
  bfx.testTrade(pair, close, pairs[pair]['entryAmount'], 'buy', 'long',
    function(){
      pairs[pair]['long'] = true;
      pairs[pair]['entryPrice'] = close;
      pairs[pair]['coinAmount'] = (pairs[pair]['entryAmount']/close);
      openedPositions++;
      console.log(pair, "Opened Long Position at: ", close, ' amount (BTC)', pairs[pair]['entryAmount']);
      console.log(pair, "Stop Loss price: ", pairs[pair]['stopLossPrice']);
      console.log(pair, ' Opened positions ', openedPositions);
      console.log("----------------------------------------------------");
    });
}

function openShortPosition(pair, close){
  pairs[pair]['stopLossPrice'] = close + pairs[pair]['atrValue']*2;
  pairs[pair]['entryAmount'] = getPositionSize(pair, close);
  bfx.testTrade(pair, close, pairs[pair]['entryAmount'], 'sell', 'short',
    function(){
      pairs[pair]['short'] = true;
      pairs[pair]['entryPrice'] = close;
      pairs[pair]['creditAmount'] = pairs[pair]['entryAmount']*close;
      openedPositions++;
      console.log(pair, "Opened Short Position at: ", close, ' amount (BTC)', pairs[pair]['entryAmount']);
      console.log(pair, "Stop Loss price: ", pairs[pair]['stopLossPrice']);
      console.log(pair, ' Opened positions ', openedPositions);
      console.log("----------------------------------------------------");
  });
}

function closeLongPosition(pair, close){
  bfx.testTrade(pair, close, pairs[pair]['coinAmount'], 'sell',  'long',
    function(){
      var profit = ((pairs[pair]['entryAmount']/pairs[pair]['entryPrice'])*close)-pairs[pair]['entryAmount'];
      pairs[pair]['profit'].push(profit);
      pairs[pair]['profitPct'].push(close/pairs[pair]['entryPrice']);
      console.log(pair, "Closed Long Position at: ", close, ' amount ', pairs[pair]['entryAmount'], pair);
      console.log(pair, 'Profit', profit, ' BTC');
      console.log('****Result amount ', bfx.initAmount);
      console.log(pair, 'Success ', pairs[pair]['success'], 'Loss ', pairs[pair]['loss']);
      console.log('Total Success ', success, 'Total Loss ', loss);
      console.log("----------------------------------------------------");
      pairs[pair]['stopLossPrice'] = 0; //Reset stoploss
      pairs[pair]['entryAmount'] = 0;
      pairs[pair]['long'] = false;
      pairs[pair]['entryPrice'] = 0;
      openedPositions--;
  });
}

function closeShortPosition(pair, close){
  bfx.testTrade(pair, close, pairs[pair]['creditAmount'], 'buy', 'short',
    function(){
      var profit = (((pairs[pair]['entryAmount']/pairs[pair]['entryPrice'])*close)-pairs[pair]['entryAmount'])*(-1);
      pairs[pair]['profit'].push(profit);
      pairs[pair]['profitPct'].push(pairs[pair]['entryPrice']/close);
      console.log(pair, "Closed Short Position at: ", close, ' amount ', pairs[pair]['entryAmount'], pair);
      console.log(pair, 'Profit', profit, ' BTC');
      console.log('****Result amount ', bfx.initAmount);
      console.log(pair, 'Success ', pairs[pair]['success'], 'Loss ', pairs[pair]['loss']);
      console.log('Total Success ', success, 'Total Loss ', loss);
      console.log("----------------------------------------------------");
      pairs[pair]['stopLossPrice'] = 0; //Reset stoploss
      pairs[pair]['entryAmount'] = 0;
      pairs[pair]['short'] = false;
      pairs[pair]['entryPrice'] = 0;
      openedPositions--;
  });
}


function getPositionSize(pair, close){ //parece otimizado Kelly Criterium

  if(pairs[pair]['profit'].length >= 50){
    var w = pairs[pair]['success']/(pairs[pair]['success']+pairs[pair]['loss']);
    
    var positive = [];
    var negative = [];
    for(var elem of pairs[pair]['profit']){
      if(elem > 0){
        positive.push(elem);
      }else{
        negative.push(Math.abs(elem));
      }
    }
    if(positive.length != 0 && negative.length != 0){
      var posAvg = 0;
      for(elem of positive){
        posAvg += elem;
      }
      posAvg = posAvg/positive.length;

      var negAvg = 0;
      for(elem of negative){
        negAvg += elem;
      }
      negAvg = negAvg/negative.length;

      var r = posAvg/negAvg;
      pairs[pair]['kelly'] = Math.abs((w - (1-w)/r)/2);
    } 

  }

  var kellyPositionSize = (bfx.initAmount * pairs[pair]['kelly']);

  var tradeRisk = 0;
  if(close < pairs[pair]['stopLossPrice']){ //Open long position
    tradeRisk = 1 - close/pairs[pair]['stopLossPrice'];
  }else{ //Open short position
    tradeRisk = 1 - pairs[pair]['stopLossPrice']/close;
  }


  var tradeRiskCoeff = 0;

  if(tradeRisk > accountRiskCoeff){
    tradeRiskCoeff = (accountRiskCoeff/tradeRisk)/(pairsArray.length - openedPositions);
  }else{
    tradeRiskCoeff = (tradeRisk/accountRiskCoeff)/(pairsArray.length - openedPositions);
  }

  var riskPositionSize = (bfx.initAmount*tradeRiskCoeff);

  var positionSize = Math.min(kellyPositionSize, riskPositionSize);
  //console.log(riskPositionSize);
  console.log(pair, "Kelly position coeff ", pairs[pair]['kelly'], "trade risk coeff ", 
    tradeRiskCoeff);
  if(kellyPositionSize > riskPositionSize){
    console.log(pair, "Position is adjusted according to risk position size");
  }else{
    console.log(pair, "Position is adjusted according to kelly position size");
  }
  
  return positionSize;
}

module.exports = Manager;
