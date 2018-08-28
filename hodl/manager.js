fs = require('fs');
const SMA = require('technicalindicators').SMA;
const ADX = require('technicalindicators').ADX;
const ATR = require('technicalindicators').ATR;
const EMA = require('technicalindicators').EMA
const pairsArray = ['BTCUSD'];
//const pairsArray = ['BATBTC', 'BCHBTC', 'BFTBTC', 'BTGBTC', 'DADBTC', 'DSHBTC', 'EOSBTC', 'ETCBTC', 'ETHBTC', 'IOTBTC', 'LTCBTC', 'NEOBTC', 'OMGBTC', 'TRXBTC', 'XMRBTC', 'XRPBTC', 'ZECBTC', 'ZRXBTC'];
const BFXTrade = require('./BfxTrade');

var bfx = new BFXTrade();
var pairs = {};

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
      ema10: new SMA({period: EMA10, values:[]}),
      ema21: new SMA({period: EMA21, values:[]}),
      adx: new ADX({period: adxPeriods, close:[], high:[], low:[]}),
      atr: new ATR({period: atrPeriods, close:[], high:[], low:[]}),
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

}


Manager.prototype.runBot = function(){

  var marketData = {};
  for(pair of pairsArray){
    marketData[pair] = JSON.parse(fs.readFileSync('../datasets/BFX_'+pair+'_1h.json', 'utf8'));
  }

  // Find bigger data, DELETE FOR REAL TIME
  var index = 0;
  var biggerIndex = 0;
  var biggerData = 0;
  for(pair of pairsArray){
    if(marketData[pair].length > biggerData){
      biggerData = marketData[pair].length;
      biggerIndex = index;
    }
    index++;
  }

  for(pair of pairsArray){
    for(i=0; i < marketData[pair].length; i++){
      if(i==0){
        openLongPosition(pair, marketData[pair][0][2]);
      }
    }
    closeLongPosition(pair, marketData[pair][i-1][2]);
  }

  console.log('--------------- HODL Results -------------------');
  console.log(' ');
  for(pair in marketData){
    var totProfit = 0;
    var totProfitPct = 0;
    for(i = 0; i<pairs[pair]['profit'].length; i++){
      totProfit += pairs[pair]['profit'][i];
      totProfitPct += pairs[pair]['profitPct'][i];
    }
    totProfitPct = 100*((totProfitPct/(pairs[pair]['profitPct'].length))-1);
    console.log(pair, 'Profit: ', totProfit);
    console.log(pair, 'AVG Profit per Trade: ', totProfitPct, '%');
  }
  console.log(' ');
  console.log('Total earns: ', (bfx.initAmount-100));
  console.log(' ');
  // for( pair in marketData){
  //   for(candle of marketData[pair]){
  //     calculateMA(pair, candle[2])
  //   }
  // }
}

//Position Manager
//Ordens de acao, gostaria de bota-las em outro arquivo
function openLongPosition(pair, close){
  pairs[pair]['stopLossPrice'] = close - pairs[pair]['atrValue']*2;
  pairs[pair]['entryAmount'] = getPositionSize();
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
  pairs[pair]['entryAmount'] = getPositionSize(close);
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


function getPositionSize(close){ //parece otimizado Kelly Criterium

  var positionSize = 100/pairsArray.length;
  return positionSize;
}

module.exports = Manager;
