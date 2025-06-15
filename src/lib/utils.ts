import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { TradePlan, TradeGroup, TradeDetail, TradeCalculationParams, TradeCalculationResult, CompoundingFrequency, CompoundingResult, WithdrawalResult } from './types';

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


export const calculateTradeGroupsLogic = (currentBalance: number, instrumentType: 'volatility75' | 'gold'): Omit<TradePlan, 'completedTrades' | 'remainingTrades'> => {
  const DAILY_TARGET_PERCENT = 0.02;
  const PER_TRADE_PIPS = instrumentType === 'gold' ? 50 : 500; // Gold pips often represent smaller price moves
  const MAX_LOT_SIZE = instrumentType === 'gold' ? 10 : 5; // Gold might allow higher max lot
  const MIN_LOT_SIZE = 0.01;

  const dailyTarget = currentBalance * DAILY_TARGET_PERCENT;
  const perTradeAmount = currentBalance * 0.01; // 1% of balance per trade group (which implies 0.5% per individual trade if 2 trades per group)
  
  // Base lots for the entire 1% target group
  const baseLotsForGroup = Math.max(perTradeAmount / PER_TRADE_PIPS, MIN_LOT_SIZE * 2); // Ensure at least 2 min lot trades for a group

  const createTradeGroup = (groupNumber: number): TradeGroup => {
      const trades: TradeDetail[] = [];
      let remainingLotsInGroup = baseLotsForGroup;
      let tradeCounterInGroup = 0;
      
      // Aim for 2 trades per 1% group, or more if lot size constrained
      const numTradesInGroup = 2; // Typically 2 trades per group for the 2% daily target
      
      for(let i=0; i<numTradesInGroup; i++) {
        if(remainingLotsInGroup <= 0 && i > 0) break; // Stop if no lots left and we made at least one trade

        const lotsForThisTrade = Math.min(MAX_LOT_SIZE, Math.max(remainingLotsInGroup / (numTradesInGroup - i), MIN_LOT_SIZE));
        if (lotsForThisTrade < MIN_LOT_SIZE && i === 0 && numTradesInGroup === 1) { // Edge case for very small balances
             trades.push({
                lots: MIN_LOT_SIZE.toFixed(3),
                profit: (MIN_LOT_SIZE * PER_TRADE_PIPS).toFixed(2),
                percent: ((MIN_LOT_SIZE * PER_TRADE_PIPS / currentBalance) * 100).toFixed(2),
                status: '🟡 Pending',
                tradeNumber: 0,
            });
            remainingLotsInGroup = 0;
            break;
        }

        trades.push({
            lots: lotsForThisTrade.toFixed(3),
            profit: (lotsForThisTrade * PER_TRADE_PIPS).toFixed(2),
            percent: ((lotsForThisTrade * PER_TRADE_PIPS / currentBalance) * 100).toFixed(2),
            status: '🟡 Pending',
            tradeNumber: tradeCounterInGroup++,
        });
        remainingLotsInGroup -= lotsForThisTrade;
      }


      return {
          groupNumber,
          trades,
          totalLots: trades.reduce((sum, trade) => sum + parseFloat(trade.lots), 0).toFixed(3),
      };
  };

  const groups = [createTradeGroup(1), createTradeGroup(2)];
  const totalTradesRequired = groups.reduce((sum, group) => sum + group.trades.length, 0);

  return {
      dailyTarget,
      totalTradesRequired,
      groups,
  };
};


export const calculateTradePointsLogic = (params: TradeCalculationParams): TradeCalculationResult => {
  const { entryPrice = 0, direction, customTP = 500, customSL = 500, currentBalance, instrumentType } = params;
  
  const goldPipValue = 0.10; // For XAUUSD, 1 pip might be $0.10 for 0.01 lot, or $1 for 0.1 lot, $10 for 1 lot. Here, we are talking about price movement.
                           // A price move from 2300.00 to 2301.00 is 100 pips if 1 pip = 0.01.
                           // If 1 pip = 0.1, then 2300.0 to 2301.0 is 10 pips.
                           // Let's assume user input pips as integer points like for V75 for simplicity.
                           // V75: 1 pip = 0.001 usually (check broker). For calculations: direct point value.
                           // Gold: 1 point movement e.g. 2350.50 to 2351.50 is "1 dollar move". How many "pips" is this?
                           // Let's assume the "pips" input by user means "points" for V75 and "ticks/small points" for Gold.
                           // For Gold, let's say 1 pip user input = 0.01 price change. So 500 pips = 5.00 price change.

  const pipsToPrice = (pips: number) => {
    if (instrumentType === 'gold') return pips * 0.01; // 1 pip = 0.01 price change. 500 pips = $5 move.
    return pips; // For V75, assume pips directly map to price difference for simplicity here.
                 // This needs to be extremely precise based on broker def for V75. Example: 1 point = 1 unit.
  }


  const perTradeAmount = currentBalance * 0.01; // 1% risk for the trade (might be different based on strategy)
  const pipsForLotCalc = instrumentType === 'gold' ? 50 : 500; // Standard pips for 1% risk lot calc
  let lots = Math.max(perTradeAmount / pipsForLotCalc, 0.01);
  lots = Math.min(lots, instrumentType === 'gold' ? 10 : 5); // Max lot size cap


  const tp500PriceMove = pipsToPrice(500);
  const tp3000PriceMove = pipsToPrice(3000);
  const tpCustomPriceMove = pipsToPrice(customTP);
  const slPriceMove = pipsToPrice(customSL);

  const tp500 = direction === 'rise' ? entryPrice + tp500PriceMove : entryPrice - tp500PriceMove;
  const tp3000 = direction === 'rise' ? entryPrice + tp3000PriceMove : entryPrice - tp3000PriceMove;
  const tpCustomVal = direction === 'rise' ? entryPrice + tpCustomPriceMove : entryPrice - tpCustomPriceMove;
  const sl = direction === 'rise' ? entryPrice - slPriceMove : entryPrice + slPriceMove;

  return {
      tp500: tp500.toFixed(instrumentType === 'gold' ? 2 : 3),
      tp3000: tp3000.toFixed(instrumentType === 'gold' ? 2 : 3),
      tpCustom: tpCustomVal.toFixed(instrumentType === 'gold' ? 2 : 3),
      slPrice: sl.toFixed(instrumentType === 'gold' ? 2 : 3),
      calculatedLots: lots.toFixed(3),
  };
};


export const calculateCompoundingLogic = (initialBalance: number, frequency: CompoundingFrequency, periods: number): CompoundingResult => {
  if (isNaN(initialBalance) || isNaN(periods) || initialBalance <= 0 || periods <= 0) {
      return { projectedBalance: "-", totalGrowth: "-" };
  }

  let days;
  switch (frequency) {
      case 'daily': days = periods; break;
      case 'monthly': days = periods * 30; break; // Approximation
      case 'yearly': days = periods * 365; break; // Approximation
      default: days = 0;
  }

  const projectedBalance = initialBalance * Math.pow(1.02, days); // Assuming 2% growth per 'effective' day
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
  // Reverse 30 periods of 2% growth to estimate balance at start of month/period
  for (let i = 0; i < 30; i++) { 
      simulatedBalanceAtStartOfMonth = simulatedBalanceAtStartOfMonth / 1.02;
  }
  
  const totalGrowthThisMonth = manualBalance - simulatedBalanceAtStartOfMonth;
  const withdrawableAmount = totalGrowthThisMonth * 0.05; // 5% of this month's growth

  return {
      totalGrowth: `$${totalGrowthThisMonth.toFixed(2)}`,
      withdrawableAmount: `$${withdrawableAmount.toFixed(2)}`,
  };
};

export const getTimezones = (): string[] => {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    return Intl.supportedValuesOf('timeZone');
  }
  // Fallback for older environments or server-side rendering where Intl might be limited
  return [
    'UTC', 'GMT', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 
    'Asia/Tokyo', 'Australia/Sydney', 'Africa/Nairobi'
    // Add more common timezones as a fallback
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
    // Fallback if the timezone is not supported, use local time.
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
