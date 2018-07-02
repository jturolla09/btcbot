fs = require('fs');
const SMA = require('technicalindicators').SMA;
const ADX = require('technicalindicators').ADX;
const ATR = require('technicalindicators').ATR;
const EMA = require('technicalindicators').EMA
const pairsArray = ['BCHBTC', 'BTGBTC', 'DSHBTC', 'EOSBTC', 'ETHBTC', 'IOTBTC', 'NEOBTC', 'OMGBTC', 'TRXBTC', 'XRPBTC'];
const BFXTrade = require('./BfxTrade');

var bfx = new BFXTrade();
var pairs = {};

const timeframes = ['1h']; //done
const accountRiskCoeffs = [0.01, 0.02, 0.03, 0.05, 0.08, 0.1]; //done

const EMA10s = [5,8,9,10,14,18,22]; //done
const EMA21s = [6,8,14,21,25,30,35]; //done
const adxPeriods = [5,10,15,20,25,30,40]; //done
const trendStrengths = [1,5,10,25,35]; //done
const atrPeriods = [5,6,8,10,12,14,18,25]; //done

var openedPositions = 0;
var success = 0;
var loss = 0;

var bestTime = 0;
var finalAmount = 0;
var bestMA = 0;
var bestADX = 0;
var bestRisk = 0;
var maxAmount = 0;
var bestStrength = 0;
var bestATR = 0;
var bestEMA10 = 0;
var bestEMA21 = 0;
// marketData returns:
// 0 = timestamp
// 1 = open price
// 2 = close price
// 3 = high price
// 4 = low price
// 5 = volume

function Manager(){

  
}

function initPairs(adxPeriod, accountRiskCoeff, trendStrength, atrPeriod, EMA10, EMA21){

  for(pair of pairsArray){
    pairs[pair]={
      ema10: new SMA({period: EMA10, values: []}),
      ema21: new SMA({period: EMA21, values: []}),
      maValue: 0,
      prevMaValue: 0,
      prevClose: 0,
      adx: new ADX({period: adxPeriod, close:[], high:[], low:[]}),
      adxValue: 0,
      atr: new ATR({period: atrPeriod, close:[], high:[], low:[]}),
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
      accountRisk: accountRiskCoeff,
      trend: trendStrength,
      EMA10Value: 0,
      EMA21Value:0,
      prev10Value: 0,
      prev21Value:0
    }
  }
}

Manager.prototype.runBot = function(){
  for(timeframe of timeframes){
    var marketData = {};
    for(pair of pairsArray){
      marketData[pair] = JSON.parse(fs.readFileSync('../datasets/BFX_'+pair+'_'+timeframe+'.json', 'utf8'));
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

    for(atrPeriod of atrPeriods){
      for(EMA21 of EMA21s){
        for(EMA10 of EMA10s){
          for(trendStrength of trendStrengths){
            for(accountRiskCoeff of accountRiskCoeffs){
              for(adxPeriod of adxPeriods){
                initPairs(adxPeriod, accountRiskCoeff, trendStrength, atrPeriod, EMA10, EMA21);
                openedPositions = 0;
                success = 0;
                loss = 0;
                bfx.initAmount = 100;
                bfx.reserve = {};
                // console.log("Starting backtest");
                // console.log("----------------------------------------------------------------");
                for(i=0; i<marketData[pairsArray[biggerIndex]].length; i++){
                  for(pair in marketData){
                    if(marketData[pair][i] != undefined){
                      updateIndicators(pair, marketData[pair][i]);  
                    }
                  }
                }

                // if(openedPositions == 0){
                //   finalAmount = bfx.initAmount;
                // }else{
                //   finalAmount = bfx.initAmount;
                //   for(pair in pairs){
                //     finalAmount += pairs[pair]['entryAmount'];
                //   }
                // }

                finalAmount = bfx.initAmount;

                if(finalAmount > maxAmount){
                  //bestMA = maPeriod;
                  bestADX = adxPeriod;
                  bestRisk = accountRiskCoeff;
                  maxAmount = finalAmount;
                  bestStrength = trendStrength;
                  bestATR = atrPeriod;
                  bestEMA10 = EMA10;
                  bestEMA21 = EMA21;

                  //console.log("bestMA", bestMA);
                  console.log("bestRISK", bestRisk);
                  console.log("bestADX", bestADX);
                  console.log("bestStrength", bestStrength);
                  console.log("bestATR", bestATR);
                  console.log('bestEMA10', bestEMA10);
                  console.log('bestEMA21', bestEMA21);
                  console.log("maxAmount", maxAmount);
                  console.log("In the timeframe of: ", timeframe);
                }
              }
            }
          }
        }
      }
    }
  }
  // for( pair in marketData){
  //   for(candle of marketData[pair]){
  //     calculateMA(pair, candle[2])
  //   }
  // }

}

function updateIndicators(pair, price){
  //pairs[pair]['prevMaValue'] = pairs[pair]['maValue'];

  pairs[pair]['prev10Value'] = pairs[pair]['EMA10Value'];
  pairs[pair]['prev21Value'] = pairs[pair]['EMA21Value'];
  //pairs[pair]['maValue'] = pairs[pair]['ma'].nextValue(price[2]);
  pairs[pair]['EMA10Value'] = pairs[pair]['ema10'].nextValue(price[2]);
  pairs[pair]['EMA21Value'] = pairs[pair]['ema21'].nextValue(price[2]);

  pairs[pair]['adxValue'] = pairs[pair]['adx'].nextValue({close: price[2] , high: price[3],
    low: price[4]});
  pairs[pair]['atrValue'] = pairs[pair]['atr'].nextValue({close: price[2] , high: price[3],
    low: price[4]});

  if(pairs[pair]['maValue'] != undefined &&
    pairs[pair]['adxValue'] != undefined &&
    pairs[pair]['atrValue'] != undefined){
    findTradeOpportunity(pair, price[2]);
  }

  pairs[pair]['prevClose'] = price[2];
}

//Aparentemente essa e a funcao que define a estrategia do BOT
function findTradeOpportunity(pair, close){
  // Se eu nao tenho ordem aberta:
  if(!pairs[pair]['long'] && !pairs[pair]['short']){
    if(pairs[pair]['prev10Value'] <= pairs[pair]['prev21Value'] 
      && pairs[pair]['EMA10Value'] > pairs[pair]['EMA21Value'] && pairs[pair]['adxValue'].adx > pairs[pair]['trend']){
      openLongPosition(pair, close);
    } else if(pairs[pair]['prev10Value'] >= pairs[pair]['prev21Value'] 
      && pairs[pair]['EMA10Value'] < pairs[pair]['EMA21Value'] && pairs[pair]['adxValue'].adx > pairs[pair]['trend']){
      openShortPosition(pair, close);
    }

  //se eu tenho ordem aberta de LONG
  }else if(pairs[pair]['long']){

      if(pairs[pair]['prev10Value'] >= pairs[pair]['prev21Value'] 
      && pairs[pair]['EMA10Value'] < pairs[pair]['EMA21Value'] && close >= 1.004*pairs[pair]['entryPrice']){
        success++;
        pairs[pair]['success']++;
        closeLongPosition(pair, close);

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
  pairs[pair]['entryAmount'] = getPositionSize(close);
  bfx.testTrade(pair, close, pairs[pair]['entryAmount'], 'buy', 'long',
    function(){
      pairs[pair]['long'] = true;
      pairs[pair]['entryPrice'] = close;
      pairs[pair]['coinAmount'] = (pairs[pair]['entryAmount']/close);
      openedPositions++;
      // console.log(pair, "Opened Long Position at: ", close, ' amount (BTC)', pairs[pair]['entryAmount']);
      // console.log(pair, "Stop Loss price: ", pairs[pair]['stopLossPrice']);
      // console.log(pair, ' Opened positions ', openedPositions);
      // console.log("----------------------------------------------------");
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
      // console.log(pair, "Opened Short Position at: ", close, ' amount (BTC)', pairs[pair]['entryAmount']);
      // console.log(pair, "Stop Loss price: ", pairs[pair]['stopLossPrice']);
      // console.log(pair, ' Opened positions ', openedPositions);
      // console.log("----------------------------------------------------");
  });
}

function closeLongPosition(pair, close){
  bfx.testTrade(pair, close, pairs[pair]['coinAmount'], 'sell',  'long',
    function(){
      var profit = ((pairs[pair]['entryAmount']/pairs[pair]['entryPrice'])*close)-pairs[pair]['entryAmount'];
      pairs[pair]['profit'].push(profit);
      pairs[pair]['profitPct'].push(close/pairs[pair]['entryPrice']);
      // console.log(pair, "Closed Long Position at: ", close, ' amount ', pairs[pair]['entryAmount'], pair);
      // console.log(pair, 'Profit', profit, ' BTC');
      // console.log('****Result amount ', bfx.initAmount);
      // console.log(pair, 'Success ', pairs[pair]['success'], 'Loss ', pairs[pair]['loss']);
      // console.log('Total Success ', success, 'Total Loss ', loss);
      // console.log("----------------------------------------------------");
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
      // console.log(pair, "Closed Short Position at: ", close, ' amount ', pairs[pair]['entryAmount'], pair);
      // console.log(pair, 'Profit', profit, ' BTC');
      // console.log('****Result amount ', bfx.initAmount);
      // console.log(pair, 'Success ', pairs[pair]['success'], 'Loss ', pairs[pair]['loss']);
      // console.log('Total Success ', success, 'Total Loss ', loss);
      // console.log("----------------------------------------------------");
      pairs[pair]['stopLossPrice'] = 0; //Reset stoploss
      pairs[pair]['entryAmount'] = 0;
      pairs[pair]['short'] = false;
      pairs[pair]['entryPrice'] = 0;
      openedPositions--;
  });
}


function getPositionSize(close){ //parece otimizado Kelly Criterium

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

  if(tradeRisk > pairs[pair]['accountRisk']){
    tradeRiskCoeff = (pairs[pair]['accountRisk']/tradeRisk)/(pairsArray.length - openedPositions);
  }else{
    tradeRiskCoeff = (tradeRisk/pairs[pair]['accountRisk'])/(pairsArray.length - openedPositions);
  }

  var riskPositionSize = (bfx.initAmount*tradeRiskCoeff);

  var positionSize = Math.min(kellyPositionSize, riskPositionSize);
  //console.log(riskPositionSize);
  // console.log(pair, "Kelly position coeff ", pairs[pair]['kelly'], "trade risk coeff ", 
  //   tradeRiskCoeff);
  // if(kellyPositionSize > riskPositionSize){
  //   console.log(pair, "Position is adjusted according to risk position size");
  // }else{
  //   console.log(pair, "Position is adjusted according to kelly position size");
  // }
  
  return positionSize;
}

module.exports = Manager;
