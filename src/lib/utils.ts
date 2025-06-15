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


export const calculateTradeGroupsLogic = (currentBalance: number, instrumentType: InstrumentType): Omit<TradePlan, 'completedTrades' | 'remainingTrades'> => {
  const DAILY_TARGET_PERCENT = 0.02;
  const MIN_LOT_SIZE = 0.01;
  const MAX_LOT_SIZE_GOLD = 10;
  const MAX_LOT_SIZE_V75 = 5;

  const dailyTarget = currentBalance * DAILY_TARGET_PERCENT;

  if (instrumentType === 'volatility75') {
    const V75_SL_PIPS = 1000;
    const V75_TP_PIPS = 2000; // Target TP for the single trade to hit 2%
    
    // Calculate lot size to risk 1% on 1000 pip SL
    let lotsForTrade = Math.max(MIN_LOT_SIZE, (currentBalance * 0.01) / V75_SL_PIPS);
    lotsForTrade = Math.min(lotsForTrade, MAX_LOT_SIZE_V75);

    const profitForTrade = lotsForTrade * V75_TP_PIPS;
    const percentForTrade = (profitForTrade / currentBalance) * 100;

    const tradeDetail: TradeDetail = {
      lots: lotsForTrade.toFixed(3),
      profit: profitForTrade.toFixed(2),
      percent: percentForTrade.toFixed(2),
      status: '🟡 Pending',
      tradeNumber: 0, // Will be updated by calling hook
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

  } else { // Gold logic (original)
    const PER_TRADE_PIPS_GOLD = 50; 
    const perTradeAmount = currentBalance * 0.01; 
    const baseLotsForGroup = Math.max(perTradeAmount / PER_TRADE_PIPS_GOLD, MIN_LOT_SIZE * 2);

    const createTradeGroup = (groupNumber: number): TradeGroup => {
        const trades: TradeDetail[] = [];
        let remainingLotsInGroup = baseLotsForGroup;
        let tradeCounterInGroup = 0;
        const numTradesInGroup = 2; 
        
        for(let i=0; i<numTradesInGroup; i++) {
          if(remainingLotsInGroup <= 0 && i > 0) break;

          let lotsForThisTrade = Math.min(MAX_LOT_SIZE_GOLD, Math.max(remainingLotsInGroup / (numTradesInGroup - i), MIN_LOT_SIZE));
          if (trades.length === 0 && lotsForThisTrade < MIN_LOT_SIZE) { // Ensure first trade is at least min lot size
            lotsForThisTrade = MIN_LOT_SIZE;
          }
          if (lotsForThisTrade < MIN_LOT_SIZE && i === 0 && numTradesInGroup === 1) { 
               trades.push({
                  lots: MIN_LOT_SIZE.toFixed(3),
                  profit: (MIN_LOT_SIZE * PER_TRADE_PIPS_GOLD).toFixed(2),
                  percent: ((MIN_LOT_SIZE * PER_TRADE_PIPS_GOLD / currentBalance) * 100).toFixed(2),
                  status: '🟡 Pending',
                  tradeNumber: 0,
              });
              remainingLotsInGroup = 0;
              break;
          }
          if (lotsForThisTrade < MIN_LOT_SIZE) break; // If subsequent trades are too small, stop.

          trades.push({
              lots: lotsForThisTrade.toFixed(3),
              profit: (lotsForThisTrade * PER_TRADE_PIPS_GOLD).toFixed(2),
              percent: ((lotsForThisTrade * PER_TRADE_PIPS_GOLD / currentBalance) * 100).toFixed(2),
              status: '🟡 Pending',
              tradeNumber: tradeCounterInGroup++, // Placeholder, will be updated by calling hook
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

  // Lot size calculation based on 1% risk of current balance against actualCustomSL
  const riskAmount = currentBalance * 0.01;
  let lots = Math.max(0.01, riskAmount / actualCustomSL); // Assuming 1 pip value is $1 for lot size calculation for V75 for simplicity here. This needs broker specific constant. For gold, it's more complex with pip value per lot.
                                                         // Let's assume for V75, SL pips directly mean dollar risk for 1 lot.
                                                         // For Gold, if 1 pip = 0.01 price move, and 1 lot SL of 50 pips = $50 risk for example.
  if (instrumentType === 'gold') {
      // Example: 1 lot, 50 pips (0.5 price change) SL, might be $500 risk (1 pip = $10 for 1 lot).
      // So, if actualCustomSL for gold is 50 pips, and riskAmount is $100, lots = 100 / (50 * pip_value_per_lot_for_1_pip_sl)
      // For now, simplify: use a common divisor that represents dollar risk per pip for a standard lot.
      // E.g. $1 per pip for V75. For Gold, if customSL is 500 ($5 price change), and 0.01 lot has $0.01 per 0.01 price change, then $0.01 per pip.
      // So 500 pips * $0.01/pip = $5 risk for 0.01 lot.
      // lots = riskAmount / (actualCustomSL * (instrumentType === 'gold' ? 0.01 : 1)); // Highly simplified placeholder for gold pip value
      lots = Math.max(0.01, riskAmount / (actualCustomSL * (instrumentType === 'gold' ? 0.1 : 1))); // Assuming 0.1 value per pip for gold for 0.01 lot
                                                                                                    // This is a placeholder and should be accurate.
                                                                                                    // More accurate: (balance * 0.01) / (SL_pips * value_per_pip_per_lot)
                                                                                                    // For gold, if 100 pips (e.g. $1 price move) SL: value_per_pip_per_lot = $0.1 for 0.01 lot. Risk = $10.
                                                                                                    // Lots = (balance*0.01) / (SL_pips_gold * 0.1)
      const goldPipsForLotCalc = actualCustomSL; // SL pips
      lots = Math.max(0.01, (currentBalance * 0.01) / (goldPipsForLotCalc * 0.1)); // Assumes 0.1 USD value per pip for 0.01 lot size on Gold
  } else { // V75
      const v75PipsForLotCalc = actualCustomSL;
      lots = Math.max(0.01, (currentBalance * 0.01) / v75PipsForLotCalc); // Assumes $1 value per pip for 1 lot size on V75, so for 0.01 lot, value is 0.01.
                                                                        // Correct: (balance * 0.01) / (SL_pips * broker_pip_value_for_min_lot) -- if SL_pips represents direct points.
                                                                        // Or (balance * 0.01) / SL_points if SL_points is the dollar risk for 1 lot.
      // Assuming SL pips directly translate to dollar risk for 0.01 lot if we want 1% risk
      // e.g. if 1000 pips SL should be 1% of balance, then lot size determines the value of those 1000 pips.
      // (currentBalance * 0.01) / actualCustomSL implies each pip is worth $1 for lot size 1.00.
      // This is a common simplification for V75 where points are directly used.
  }
  lots = Math.min(lots, instrumentType === 'gold' ? 10 : 5);


  const tp1000PriceMove = pipsToPrice(instrumentType === 'volatility75' ? 1000 : 50); // Gold uses 50 for this slot
  const tp2000PriceMove = pipsToPrice(instrumentType === 'volatility75' ? 2000 : 300); // Gold uses 300 for this slot
  const tpCustomPriceMove = pipsToPrice(actualCustomTP);
  const slPriceMove = pipsToPrice(actualCustomSL);

  const tp1000 = direction === 'rise' ? entryPrice + tp1000PriceMove : entryPrice - tp1000PriceMove;
  const tp2000 = direction === 'rise' ? entryPrice + tp2000PriceMove : entryPrice - tp2000PriceMove;
  const tpCustomVal = direction === 'rise' ? entryPrice + tpCustomPriceMove : entryPrice - tpCustomPriceMove;
  const sl = direction === 'rise' ? entryPrice - slPriceMove : entryPrice + slPriceMove;

  const pricePrecision = instrumentType === 'gold' ? 2 : 3;

  return {
      tp1000: tp1000.toFixed(pricePrecision),
      tp2000: tp2000.toFixed(pricePrecision),
      tpCustom: tpCustomVal.toFixed(pricePrecision),
      slPrice: sl.toFixed(pricePrecision),
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
      case 'monthly': days = periods * 20; break; // Approx 20 trading days
      case 'yearly': days = periods * 250; break; // Approx 250 trading days
      default: days = 0;
  }

  const projectedBalance = initialBalance * Math.pow(1.02, days); // Assuming 2% growth per 'effective' trading day
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
  // Reverse 20 periods (approx trading days in a month) of 2% growth
  for (let i = 0; i < 20; i++) { 
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
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch (e) {
      // Fallback if specific timezone support is problematic (e.g. in some test environments)
    }
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
