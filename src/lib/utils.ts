
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
  const DAILY_TARGET_PERCENT = 0.02; // Target 2% daily gain
  const RISK_PER_TRADE_PERCENT = 0.01; // Risk 1% per trade

  const dailyTarget = currentBalance * DAILY_TARGET_PERCENT;

  if (instrumentType === 'volatility75') {
    const V75_SL_PIPS = 1000; // Stop Loss for V75 is 1000 pips
    const V75_TP_PIPS = 2000; // Take Profit for V75 is 2000 pips (for 2% gain with 1% risk)
    
    // Calculate lot size to risk 1% of currentBalance over V75_SL_PIPS
    let lotsForTrade = (currentBalance * RISK_PER_TRADE_PERCENT) / V75_SL_PIPS;
    lotsForTrade = Math.max(MIN_LOT_SIZE_V75, lotsForTrade); // Ensure minimum lot size
    lotsForTrade = Math.min(MAX_LOT_SIZE_V75, lotsForTrade); // Ensure maximum lot size

    const profitForTrade = lotsForTrade * V75_TP_PIPS; 
    // Percent gain should be approx. 2% because TP is 2x SL and lot size is for 1% risk at SL
    const percentForTrade = (profitForTrade / currentBalance) * 100;

    const tradeDetail: TradeDetail = {
      lots: lotsForTrade.toFixed(3),
      profit: profitForTrade.toFixed(2),
      percent: percentForTrade.toFixed(2), 
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
      totalTradesRequired: 1, // Daily target achieved with one trade
      groups: [group],
    };

  } else { // Gold logic (aims for 2% daily, might be split into two 1% groups)
    const GOLD_PER_TRADE_TARGET_PERCENT = 0.01; // Each group/set of trades aims for 1%
    const GOLD_SL_PIPS_PER_TRADE = 50; // SL for each gold trade component within a group.
                                        // Lot size for gold trades will be based on risking a portion of the 1% group target over these pips.
    
    const targetProfitPerGroup = currentBalance * GOLD_PER_TRADE_TARGET_PERCENT;

    const createTradeGroup = (groupNumber: number): TradeGroup => {
        const numTradesInGroup = 2; // Typically split a 1% target into 2 trades for Gold
        const targetProfitPerSubTrade = targetProfitPerGroup / numTradesInGroup;

        // Calculate lots for each sub-trade to achieve targetProfitPerSubTrade with GOLD_SL_PIPS_PER_TRADE
        // This is a simplified lot calculation for gold where profit is directly related to pips * lots * pip_value
        // For gold, pip value is often $0.1 for 0.01 lots for 1 pip. So, Profit = Lots * Pips * 10 (if 1 lot = $1/pip)
        // Or Lots = Profit_Target / (Pips * Pip_Value_Factor)
        // Let's use a pip value factor of 0.1 for 0.01 lots for now. So for X lots, factor is X * 10.
        // Lots = Profit_Target / (Pips * 0.1 * (Lots/0.01)) -> this circular.
        // Simpler: Lot size to make $targetProfitPerSubTrade in GOLD_SL_PIPS_PER_TRADE
        // If 50 pips profit with 0.01 lot = 50 * $0.1 = $5.
        // Target lots = (TargetProfit / (Pips * $0.1)) * 0.01
        
        let lotsPerSubTrade = (targetProfitPerSubTrade / (GOLD_SL_PIPS_PER_TRADE * 0.1)); // This gives lot value like 0.01, 0.02 etc.
        lotsPerSubTrade = Math.max(MIN_LOT_SIZE_GOLD, lotsPerSubTrade);
        lotsPerSubTrade = Math.min(MAX_LOT_SIZE_GOLD, lotsPerSubTrade);
        
        const trades: TradeDetail[] = [];
        for(let i=0; i<numTradesInGroup; i++) {
           const profitOfSubTrade = lotsPerSubTrade * GOLD_SL_PIPS_PER_TRADE * 0.1; // Using 0.1 factor as value of 1 pip for 0.01 lot
           trades.push({
              lots: lotsPerSubTrade.toFixed(2),
              profit: profitOfSubTrade.toFixed(2),
              percent: ((profitOfSubTrade / currentBalance) * 100).toFixed(2),
              status: '🟡 Pending',
              tradeNumber: 0, // Placeholder, will be updated in useDashboardState
          });
        }
        
        return {
            groupNumber,
            trades,
            totalLots: (lotsPerSubTrade * numTradesInGroup).toFixed(2),
        };
    };

    const groups = [createTradeGroup(1), createTradeGroup(2)]; // Two groups to reach 2% daily target
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
  
  const defaultCustomTP = instrumentType === 'volatility75' ? 2000 : 500; // V75 default TP 2000 pips
  const defaultCustomSL = instrumentType === 'volatility75' ? 1000 : 500; // V75 default SL 1000 pips

  const actualCustomTP = customTP !== undefined && customTP > 0 ? customTP : defaultCustomTP;
  const actualCustomSL = customSL !== undefined && customSL > 0 ? customSL : defaultCustomSL;
  
  const pipsToPrice = (pips: number) => {
    // For V75, 1 pip might be 1 unit of price, for Gold, 1 pip is 0.01 unit of price.
    // This function assumes 'pips' argument is always in the instrument's smallest unit that corresponds to a "pip"
    if (instrumentType === 'gold') return pips * 0.01; // e.g. 50 pips = 0.5 price move
    return pips; // e.g. 1000 pips = 1000 price move for V75
  }

  const riskPercent = 0.01; // Risk 1% of balance for the calculated lot size
  let lots;

  if (instrumentType === 'gold') {
      // Lot size for 1% risk over actualCustomSL pips
      // Profit/Loss for Gold per 0.01 lot per pip = $0.1
      // Risk Amount = currentBalance * riskPercent
      // Lots_Value = RiskAmount / (SL_Pips * Pip_Value_Per_Lot_Value_Per_Pip)
      // Lots_Value = (currentBalance * riskPercent) / (actualCustomSL * 0.1)
      lots = (currentBalance * riskPercent) / (actualCustomSL * 0.1); 
      lots = Math.max(MIN_LOT_SIZE_GOLD, lots);
      lots = Math.min(lots, MAX_LOT_SIZE_GOLD);
  } else { // V75
      // Lot size for 1% risk over actualCustomSL pips
      // For V75, assume $1 profit/loss per 1 lot per pip.
      // Risk Amount = currentBalance * riskPercent
      // Lots = RiskAmount / (SL_Pips * Pip_Value_Per_Lot_for_1_Pip)
      // Lots = (currentBalance * riskPercent) / (actualCustomSL * 1) if 1 lot=$1/pip
      lots = (currentBalance * riskPercent) / actualCustomSL;
      lots = Math.max(MIN_LOT_SIZE_V75, lots);
      lots = Math.min(lots, MAX_LOT_SIZE_V75);
  }


  const tpDefault1Pips = instrumentType === 'volatility75' ? 1000 : 50;
  const tpDefault2Pips = instrumentType === 'volatility75' ? 2000 : 300;

  const tpDefault1PriceMove = pipsToPrice(tpDefault1Pips);
  const tpDefault2PriceMove = pipsToPrice(tpDefault2Pips);
  const tpCustomPriceMove = pipsToPrice(actualCustomTP);
  const slPriceMove = pipsToPrice(actualCustomSL);

  const tpDefault1 = direction === 'rise' ? entryPrice + tpDefault1PriceMove : entryPrice - tpDefault1PriceMove;
  const tpDefault2 = direction === 'rise' ? entryPrice + tpDefault2PriceMove : entryPrice - tpDefault2PriceMove;
  const tpCustomVal = direction === 'rise' ? entryPrice + tpCustomPriceMove : entryPrice - tpCustomPriceMove;
  const sl = direction === 'rise' ? entryPrice - slPriceMove : entryPrice + slPriceMove;

  const pricePrecision = instrumentType === 'gold' ? 2 : 3; // Gold prices e.g. 2050.75, V75 e.g. 345678.123
  const lotPrecision = instrumentType === 'gold' ? 2 : 3;


  return {
      tp1000: entryPrice > 0 ? tpDefault1.toFixed(pricePrecision) : "-", // Renamed from tp500
      tp2000: entryPrice > 0 ? tpDefault2.toFixed(pricePrecision) : "-", // Renamed from tp3000
      tpCustom: entryPrice > 0 ? tpCustomVal.toFixed(pricePrecision) : "-",
      slPrice: entryPrice > 0 ? sl.toFixed(pricePrecision) : "-",
      calculatedLots: currentBalance > 0 && entryPrice > 0 ? lots.toFixed(lotPrecision) : (0).toFixed(lotPrecision),
  };
};


export const calculateCompoundingLogic = (initialBalance: number, frequency: CompoundingFrequency, periods: number): CompoundingResult => {
  if (isNaN(initialBalance) || isNaN(periods) || initialBalance <= 0 || periods <= 0) {
      return { projectedBalance: "-", totalGrowth: "-" };
  }

  let days;
  const dailyGrowthRate = 1.02; // Assuming 2% growth per trading day
  switch (frequency) {
      case 'daily': days = periods; break; // periods are actual trading days
      case 'monthly': days = periods * 20; break; // Approx 20 trading days in a month
      case 'yearly': days = periods * 250; break; // Approx 250 trading days in a year
      default: days = 0;
  }

  const projectedBalance = initialBalance * Math.pow(dailyGrowthRate, days); 
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

  // Simulate balance at the start of a 20-trading-day period
  // by reversing 20 days of 2% growth
  let simulatedBalanceAtStartOfPeriod = manualBalance;
  const dailyGrowthRate = 1.02;
  const tradingDaysInMonth = 20;
  
  for (let i = 0; i < tradingDaysInMonth; i++) { 
      simulatedBalanceAtStartOfPeriod = simulatedBalanceAtStartOfPeriod / dailyGrowthRate;
  }
  
  const totalGrowthThisPeriod = manualBalance - simulatedBalanceAtStartOfPeriod;
  const withdrawableAmount = totalGrowthThisPeriod * 0.05; // 5% of the growth

  return {
      totalGrowth: `$${totalGrowthThisPeriod.toFixed(2)}`,
      withdrawableAmount: `$${withdrawableAmount.toFixed(2)}`,
  };
};

export const getTimezones = (): string[] => {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch (e) {
      // Fallback if specific error, e.g. in older environments
    }
  }
  // Basic fallback list
  return [
    'UTC', 'GMT', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 
    'Asia/Tokyo', 'Australia/Sydney', 'Africa/Nairobi'
    // Add more common timezones if needed
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
    // If the provided timezone is invalid or Intl API fails for it
    console.warn("Timezone error, falling back to local time string:", error);
     const optionsNoError: Intl.DateTimeFormatOptions = { // Ensure these options don't cause error
        hour12: true,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
    };
    return new Date().toLocaleString('en-US', optionsNoError);
  }
};
