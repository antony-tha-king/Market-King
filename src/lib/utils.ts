
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TradePlan, TradeGroup, TradeDetail, TradeCalculationParams, TradeCalculationResult, CompoundingFrequency, CompoundingResult, WithdrawalResult, InstrumentType } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getLocalStorageItem = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  const storedValue = localStorage.getItem(key);
  if (storedValue === null) {
    return defaultValue;
  }
  try {
    return JSON.parse(storedValue) as T;
  } catch (error) {
    console.error(`Error parsing localStorage item ${key}:`, error);
    return defaultValue;
  }
};

export const setLocalStorageItem = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting localStorage item ${key}:`, error);
  }
};

const MIN_LOT_SIZE_GOLD = 0.01;
const MIN_LOT_SIZE_V75 = 0.001;
const MAX_LOT_SIZE_GOLD = 10;
const MAX_LOT_SIZE_V75 = 5;


export const calculateTradeGroupsLogic = (currentBalance: number, instrumentType: InstrumentType): Omit<TradePlan, 'completedTrades' | 'remainingTrades'> => {
  const DAILY_TARGET_PERCENT = 0.02;

  const dailyTarget = currentBalance * DAILY_TARGET_PERCENT;

  if (instrumentType === 'volatility75') {
    const V75_SL_PIPS = 1000;
    const V75_TP_PIPS = 2000;
    
    let lotsForTrade = Math.max(MIN_LOT_SIZE_V75, (currentBalance * 0.01) / V75_SL_PIPS); // Risk 1%
    lotsForTrade = Math.min(lotsForTrade, MAX_LOT_SIZE_V75);

    const profitForTrade = lotsForTrade * V75_TP_PIPS; // Gain with 2000 pips TP
    const percentForTrade = (profitForTrade / currentBalance) * 100;

    const tradeDetail: TradeDetail = {
      lots: lotsForTrade.toFixed(3),
      profit: profitForTrade.toFixed(2),
      percent: percentForTrade.toFixed(2), // Should be ~2%
      status: '🟡 Pending',
      tradeNumber: 0, 
    };
    
    const group: TradeGroup = {
      groupNumber: 1,
      trades: [tradeDetail],
      totalLots: lotsForTrade.toFixed(3),
    };

    return {
      dailyTarget,
      totalTradesRequired: 1,
      groups: [group],
    };

  } else { // Gold logic
    const PER_TRADE_PIPS_GOLD = 50; 
    const perTradeAmount = currentBalance * 0.01; // This is the target profit for a group (1% of balance)
    const baseLotsForGroup = Math.max(perTradeAmount / PER_TRADE_PIPS_GOLD, MIN_LOT_SIZE_GOLD * 2); // Lot size to achieve 1% profit with 50 pips, split over 2 trades

    const createTradeGroup = (groupNumber: number): TradeGroup => {
        const trades: TradeDetail[] = [];
        let remainingLotsInGroup = baseLotsForGroup;
        let tradeCounterInGroup = 0;
        const numTradesInGroup = 2; 
        
        for(let i=0; i<numTradesInGroup; i++) {
          if(remainingLotsInGroup <= 0 && i > 0) break;

          let lotsForThisTrade = Math.min(MAX_LOT_SIZE_GOLD, Math.max(remainingLotsInGroup / (numTradesInGroup - i), MIN_LOT_SIZE_GOLD));
          if (trades.length === 0 && lotsForThisTrade < MIN_LOT_SIZE_GOLD) { 
            lotsForThisTrade = MIN_LOT_SIZE_GOLD;
          }
          if (lotsForThisTrade < MIN_LOT_SIZE_GOLD && i === 0 && numTradesInGroup === 1) { 
               trades.push({
                  lots: MIN_LOT_SIZE_GOLD.toFixed(2), // Gold lots usually to 2 decimal places
                  profit: (MIN_LOT_SIZE_GOLD * PER_TRADE_PIPS_GOLD).toFixed(2),
                  percent: ((MIN_LOT_SIZE_GOLD * PER_TRADE_PIPS_GOLD / currentBalance) * 100).toFixed(2),
                  status: '🟡 Pending',
                  tradeNumber: 0,
              });
              remainingLotsInGroup = 0;
              break;
          }
          if (lotsForThisTrade < MIN_LOT_SIZE_GOLD) break; 

          trades.push({
              lots: lotsForThisTrade.toFixed(2), // Gold lots usually to 2 decimal places
              profit: (lotsForThisTrade * PER_TRADE_PIPS_GOLD).toFixed(2),
              percent: ((lotsForThisTrade * PER_TRADE_PIPS_GOLD / currentBalance) * 100).toFixed(2),
              status: '🟡 Pending',
              tradeNumber: tradeCounterInGroup++,
          });
          remainingLotsInGroup -= lotsForThisTrade;
        }

        return {
            groupNumber,
            trades,
            totalLots: trades.reduce((sum, trade) => sum + parseFloat(trade.lots), 0).toFixed(2), // Gold lots sum
        };
    };

    const groups = [createTradeGroup(1), createTradeGroup(2)];
    const totalTradesRequired = groups.reduce((sum, group) => sum + group.trades.length, 0);

    return {
        dailyTarget,
        totalTradesRequired,
        groups,
    };
  }
};


export const calculateTradePointsLogic = (params: TradeCalculationParams): TradeCalculationResult => {
  const { entryPrice = 0, direction, customTP, customSL, currentBalance, instrumentType } = params;
  
  const defaultCustomTP = instrumentType === 'volatility75' ? 2000 : 500;
  const defaultCustomSL = instrumentType === 'volatility75' ? 1000 : 500;

  const actualCustomTP = customTP !== undefined && customTP > 0 ? customTP : defaultCustomTP;
  const actualCustomSL = customSL !== undefined && customSL > 0 ? customSL : defaultCustomSL;
  
  const pipsToPrice = (pips: number) => {
    if (instrumentType === 'gold') return pips * 0.01; 
    return pips; 
  }

  const riskPercent = 0.01;
  let lots;

  if (instrumentType === 'gold') {
      // For Gold, 1 pip is 0.01 price move. Pip value for 0.01 lots is $0.01 per pip.
      // So, actualCustomSL (in pips) * 0.01 gives dollar risk for 0.01 lot.
      // Dollar risk for 1 lot = actualCustomSL * $1.
      // Dollar risk for 'L' lots = L * actualCustomSL * $1 (if pip value is $1 for 1 lot).
      // If we assume $0.1 value per pip for 0.01 lot, then for 'actualCustomSL' pips, the risk for 0.01 lot is actualCustomSL * 0.1.
      // Lots = (Balance * Risk%) / (SL_Pips_Value_for_1_Lot)
      // Lots = (Balance * Risk%) / (SL_Pips * Pip_Value_Per_Lot_for_1_Pip)
      // For gold, a common value is $0.1 per pip for 0.01 lot. So for X lots, it's X * 100 * $0.1 = X * $10 per pip.
      // Risk amount = currentBalance * riskPercent
      // $Risk = Lots * SL_pips * PipValuePerLotPerPip
      // PipValuePerLotPerPip for gold for 0.01 lot = $0.1 (This means $10 per pip for 1 lot) - this needs to be checked per broker
      // For now, let's use the 0.1 factor which implies $0.1/pip for 0.01 lot.
      lots = Math.max(MIN_LOT_SIZE_GOLD, (currentBalance * riskPercent) / (actualCustomSL * 0.1));
      lots = Math.min(lots, MAX_LOT_SIZE_GOLD);
  } else { // V75
      // For V75, 1 pip often directly corresponds to $1 for 1 lot. So for 0.001 lots, it's $0.001 per pip.
      // $Risk = Lots * SL_pips * PipValuePerLotPerPip
      // PipValuePerLotPerPip for V75 for 0.001 lot = $0.001
      // Risk amount = currentBalance * riskPercent
      // Lots = RiskAmount / (actualCustomSL * 0.001) is wrong.
      // Lots = RiskAmount / SL_Pips (assuming $1 per pip for 1 lot)
      lots = Math.max(MIN_LOT_SIZE_V75, (currentBalance * riskPercent) / actualCustomSL);
      lots = Math.min(lots, MAX_LOT_SIZE_V75);
  }


  const tp1000PriceMove = pipsToPrice(instrumentType === 'volatility75' ? 1000 : 50);
  const tp2000PriceMove = pipsToPrice(instrumentType === 'volatility75' ? 2000 : 300);
  const tpCustomPriceMove = pipsToPrice(actualCustomTP);
  const slPriceMove = pipsToPrice(actualCustomSL);

  const tp1000 = direction === 'rise' ? entryPrice + tp1000PriceMove : entryPrice - tp1000PriceMove;
  const tp2000 = direction === 'rise' ? entryPrice + tp2000PriceMove : entryPrice - tp2000PriceMove;
  const tpCustomVal = direction === 'rise' ? entryPrice + tpCustomPriceMove : entryPrice - tpCustomPriceMove;
  const sl = direction === 'rise' ? entryPrice - slPriceMove : entryPrice + slPriceMove;

  const pricePrecision = instrumentType === 'gold' ? 2 : 3;
  const lotPrecision = instrumentType === 'gold' ? 2 : 3;


  return {
      tp1000: tp1000.toFixed(pricePrecision),
      tp2000: tp2000.toFixed(pricePrecision),
      tpCustom: tpCustomVal.toFixed(pricePrecision),
      slPrice: sl.toFixed(pricePrecision),
      calculatedLots: lots.toFixed(lotPrecision),
  };
};


export const calculateCompoundingLogic = (initialBalance: number, frequency: CompoundingFrequency, periods: number): CompoundingResult => {
  if (isNaN(initialBalance) || isNaN(periods) || initialBalance <= 0 || periods <= 0) {
      return { projectedBalance: "-", totalGrowth: "-" };
  }

  let days;
  switch (frequency) {
      case 'daily': days = periods; break;
      case 'monthly': days = periods * 20; break; 
      case 'yearly': days = periods * 250; break; 
      default: days = 0;
  }

  const projectedBalance = initialBalance * Math.pow(1.02, days); 
  const totalGrowth = projectedBalance - initialBalance;

  return {
      projectedBalance: `$${projectedBalance.toFixed(2)}`,
      totalGrowth: `$${totalGrowth.toFixed(2)}`,
  };
};

export const calculateWithdrawalLogic = (manualBalance: number): WithdrawalResult => {
  if (isNaN(manualBalance) || manualBalance <= 0) {
      return { totalGrowth: "-", withdrawableAmount: "-" };
  }

  let simulatedBalanceAtStartOfMonth = manualBalance;
  
  for (let i = 0; i < 20; i++) { 
      simulatedBalanceAtStartOfMonth = simulatedBalanceAtStartOfMonth / 1.02;
  }
  
  const totalGrowthThisMonth = manualBalance - simulatedBalanceAtStartOfMonth;
  const withdrawableAmount = totalGrowthThisMonth * 0.05;

  return {
      totalGrowth: `$${totalGrowthThisMonth.toFixed(2)}`,
      withdrawableAmount: `$${withdrawableAmount.toFixed(2)}`,
  };
};

export const getTimezones = (): string[] => {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch (e) {
      
    }
  }
  
  return [
    'UTC', 'GMT', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 
    'Asia/Tokyo', 'Australia/Sydney', 'Africa/Nairobi'
    
  ];
};

export const formatCurrentDateTime = (timeZone?: string): string => {
  if (typeof window === 'undefined') return "Loading time...";
  try {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        hour12: true,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    };
    return new Date().toLocaleString('en-US', options);
  } catch (error) {
    
    console.warn("Timezone error, falling back to local time:", error);
     const options: Intl.DateTimeFormatOptions = {
        hour12: true,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    };
    return new Date().toLocaleString('en-US', options);
  }
};

