
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
const MAX_LOT_SIZE_GOLD = 10;
const MIN_LOT_SIZE_V75 = 0.001;
const MAX_LOT_SIZE_V75 = 5;

// Constants for V75 based on user's strategy
const V75_PIPS_FOR_1_PERCENT_LOT_CALC = 500; // Lot size calculated based on 500 pips = 1% risk
const V75_SL_PIPS_IN_PLAN = 1000; // Actual SL used in the V75 trade plan
const V75_TP_PIPS_IN_PLAN = 2000; // Actual TP used in the V75 trade plan


export const calculateTradeGroupsLogic = (currentBalance: number, instrumentType: InstrumentType): Omit<TradePlan, 'completedTrades' | 'remainingTrades'> => {
  const DAILY_TARGET_PERCENT = 0.02; // General daily target displayed
  const RISK_PER_TRADE_PERCENT = 0.01; // Base for lot calculation (1% of balance)

  const dailyTargetMonetary = currentBalance * DAILY_TARGET_PERCENT;

  if (instrumentType === 'volatility75') {
    // Lot size for V75: Risk 1% of currentBalance over V75_PIPS_FOR_1_PERCENT_LOT_CALC (500 pips)
    // Assuming 1 lot = $1 profit/loss per pip for V75
    let lotsForTrade = (currentBalance * RISK_PER_TRADE_PERCENT) / V75_PIPS_FOR_1_PERCENT_LOT_CALC;
    lotsForTrade = Math.max(MIN_LOT_SIZE_V75, lotsForTrade);
    lotsForTrade = Math.min(MAX_LOT_SIZE_V75, lotsForTrade);

    // With this lot size, a 1000 pip SL (V75_SL_PIPS_IN_PLAN) means 2% risk.
    // And a 2000 pip TP (V75_TP_PIPS_IN_PLAN) means 4% gain.
    const profitForTrade = lotsForTrade * V75_TP_PIPS_IN_PLAN;
    const percentForTrade = (profitForTrade / currentBalance) * 100; // This will be 4%

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
      dailyTarget: dailyTargetMonetary, // Displayed daily target remains 2%
      totalTradesRequired: 1,
      groups: [group],
    };

  } else { // Gold logic
    const GOLD_PER_TRADE_TARGET_PERCENT = 0.01;
    const GOLD_SL_PIPS_PER_TRADE = 50; // Pip distance for calculating lot size for sub-trades

    const targetProfitPerGroup = currentBalance * GOLD_PER_TRADE_TARGET_PERCENT;

    const createTradeGroup = (groupNumber: number): TradeGroup => {
        const numTradesInGroup = 2;
        const targetProfitPerSubTrade = targetProfitPerGroup / numTradesInGroup;

        // For gold, 0.01 lots = $0.1 profit/loss per pip.
        // Lots_Value_Like_0.01_0.02 = TargetProfit / (Pips * 0.1)
        let lotsPerSubTrade = targetProfitPerSubTrade / (GOLD_SL_PIPS_PER_TRADE * 0.1);
        lotsPerSubTrade = Math.max(MIN_LOT_SIZE_GOLD, lotsPerSubTrade);
        lotsPerSubTrade = Math.min(MAX_LOT_SIZE_GOLD, lotsPerSubTrade);

        const trades: TradeDetail[] = [];
        for(let i=0; i<numTradesInGroup; i++) {
           const profitOfSubTrade = lotsPerSubTrade * GOLD_SL_PIPS_PER_TRADE * 0.1;
           trades.push({
              lots: lotsPerSubTrade.toFixed(2),
              profit: profitOfSubTrade.toFixed(2),
              percent: ((profitOfSubTrade / currentBalance) * 100).toFixed(2),
              status: '🟡 Pending',
              tradeNumber: 0,
          });
        }

        return {
            groupNumber,
            trades,
            totalLots: (lotsPerSubTrade * numTradesInGroup).toFixed(2),
        };
    };

    const groups = [createTradeGroup(1), createTradeGroup(2)];
    const totalTradesRequired = groups.reduce((sum, group) => sum + group.trades.length, 0);

    return {
        dailyTarget: dailyTargetMonetary,
        totalTradesRequired,
        groups,
    };
  }
};


export const calculateTradePointsLogic = (params: TradeCalculationParams): TradeCalculationResult => {
  const { entryPrice = 0, direction, customTP, customSL, currentBalance, instrumentType } = params;

  const defaultCustomTP = instrumentType === 'volatility75' ? V75_TP_PIPS_IN_PLAN : 500; // V75 default TP 2000 pips
  const defaultCustomSL = instrumentType === 'volatility75' ? V75_SL_PIPS_IN_PLAN : 500; // V75 default SL 1000 pips

  const actualCustomTP = customTP !== undefined && customTP > 0 ? customTP : defaultCustomTP;
  const actualCustomSL = customSL !== undefined && customSL > 0 ? customSL : defaultCustomSL;

  const pipsToPrice = (pips: number) => {
    if (instrumentType === 'gold') return pips * 0.01;
    return pips;
  }

  const riskPercentForCalcLots = 0.01; // Always use 1% of balance for this specific lot calculation
  let lots;
  let lotPrecision;

  if (instrumentType === 'gold') {
      // Lot size for Gold: Risk 1% of balance over actualCustomSL pips.
      // 0.01 lots = $0.1 per pip for Gold.
      // Lots_Value_Like_0.01_0.02 = (Balance * RiskPercent) / (Pips_SL * 0.1)
      lots = (currentBalance * riskPercentForCalcLots) / (actualCustomSL * 0.1);
      lots = Math.max(MIN_LOT_SIZE_GOLD, lots);
      lots = Math.min(MAX_LOT_SIZE_GOLD, lots);
      lotPrecision = 2;
  } else { // V75
      // Lot size for V75: Risk 1% of balance over V75_PIPS_FOR_1_PERCENT_LOT_CALC (500 pips),
      // irrespective of actualCustomSL for this calculator's lot recommendation (matching user's JS).
      // Assuming 1 lot = $1 profit/loss per pip for V75.
      // Lots = (Balance * RiskPercent) / Pips_Fixed_For_Lot_Calc
      lots = (currentBalance * riskPercentForCalcLots) / V75_PIPS_FOR_1_PERCENT_LOT_CALC;
      lots = Math.max(MIN_LOT_SIZE_V75, lots);
      lots = Math.min(MAX_LOT_SIZE_V75, lots);
      lotPrecision = 3;
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

  const pricePrecision = instrumentType === 'gold' ? 2 : (instrumentType === 'volatility75' ? 3 : 2) ;


  return {
      tp1000: entryPrice > 0 ? tpDefault1.toFixed(pricePrecision) : "-",
      tp2000: entryPrice > 0 ? tpDefault2.toFixed(pricePrecision) : "-",
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
  const dailyGrowthRate = 1.02;
  switch (frequency) {
      case 'daily': days = periods; break;
      case 'monthly': days = periods * 20; break;
      case 'yearly': days = periods * 250; break;
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

  let simulatedBalanceAtStartOfPeriod = manualBalance;
  const dailyGrowthRate = 1.02;
  const tradingDaysInMonth = 20;

  for (let i = 0; i < tradingDaysInMonth; i++) {
      simulatedBalanceAtStartOfPeriod = simulatedBalanceAtStartOfPeriod / dailyGrowthRate;
  }

  const totalGrowthThisPeriod = manualBalance - simulatedBalanceAtStartOfPeriod;
  const withdrawableAmount = totalGrowthThisPeriod * 0.05;

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
      // Fallback
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
    console.warn("Timezone error, falling back to local time string:", error);
     const optionsNoError: Intl.DateTimeFormatOptions = {
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
