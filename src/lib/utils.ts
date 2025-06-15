
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

const V75_PIPS_FOR_1_PERCENT_RISK_LOT_CALC = 500; // Lot size calculated based on 500 pips = 1% risk principle
const V75_SL_PIPS_IN_PLAN = 1000;
const V75_TP_PIPS_IN_PLAN = 2000;


export const calculateTradeGroupsLogic = (currentBalance: number, instrumentType: InstrumentType): Omit<TradePlan, 'completedTrades' | 'remainingTrades'> => {
  const RISK_PER_TRADE_PERCENT_FOR_LOT_CALC = 0.01; // Base for lot calculation (1% of balance for X pips)

  if (instrumentType === 'volatility75') {
    let baseLots = (currentBalance * RISK_PER_TRADE_PERCENT_FOR_LOT_CALC) / V75_PIPS_FOR_1_PERCENT_RISK_LOT_CALC;
    let preciseLotsForTrade = Math.max(MIN_LOT_SIZE_V75, baseLots);
    preciseLotsForTrade = Math.min(MAX_LOT_SIZE_V75, preciseLotsForTrade);
    
    const lotsStringForPlan = preciseLotsForTrade.toFixed(3);
    const actualLotsUsedInPlan = parseFloat(lotsStringForPlan);

    const profitForTrade = actualLotsUsedInPlan * V75_TP_PIPS_IN_PLAN;
    const percentForTrade = currentBalance > 0 ? (profitForTrade / currentBalance) * 100 : 0;

    const tradeDetail: TradeDetail = {
      lots: lotsStringForPlan,
      profit: profitForTrade.toFixed(2),
      percent: percentForTrade.toFixed(2),
      status: '🟡 Pending',
      tradeNumber: 0,
    };

    const group: TradeGroup = {
      groupNumber: 1,
      trades: [tradeDetail],
      totalLots: lotsStringForPlan,
    };

    return {
      dailyTarget: profitForTrade,
      totalTradesRequired: 1,
      groups: [group],
    };

  } else { // Gold logic
    const DAILY_TARGET_PERCENT_GOLD = 0.02;
    const GOLD_PER_TRADE_TARGET_PERCENT = 0.01;
    const GOLD_SL_PIPS_PER_TRADE = 50; 

    const dailyTargetMonetaryGold = currentBalance * DAILY_TARGET_PERCENT_GOLD;
    const targetProfitPerGroup = currentBalance * GOLD_PER_TRADE_TARGET_PERCENT;

    const createTradeGroup = (groupNumber: number): TradeGroup => {
        const numTradesInGroup = 2;
        const targetProfitPerSubTrade = targetProfitPerGroup / numTradesInGroup;

        let lotsPerSubTrade = targetProfitPerSubTrade / (GOLD_SL_PIPS_PER_TRADE * 0.1);
        lotsPerSubTrade = Math.max(MIN_LOT_SIZE_GOLD, lotsPerSubTrade);
        lotsPerSubTrade = Math.min(MAX_LOT_SIZE_GOLD, lotsPerSubTrade);
        
        const lotsStringForSubTrade = lotsPerSubTrade.toFixed(2);
        const actualLotsUsedInSubTrade = parseFloat(lotsStringForSubTrade);

        const trades: TradeDetail[] = [];
        for(let i=0; i<numTradesInGroup; i++) {
           const profitOfSubTrade = actualLotsUsedInSubTrade * GOLD_SL_PIPS_PER_TRADE * 0.1;
           trades.push({
              lots: lotsStringForSubTrade,
              profit: profitOfSubTrade.toFixed(2),
              percent: currentBalance > 0 ? ((profitOfSubTrade / currentBalance) * 100).toFixed(2) : "0.00",
              status: '🟡 Pending',
              tradeNumber: 0,
          });
        }
        
        const totalLotsForGroup = (actualLotsUsedInSubTrade * numTradesInGroup).toFixed(2);

        return {
            groupNumber,
            trades,
            totalLots: totalLotsForGroup,
        };
    };

    const groups = [createTradeGroup(1), createTradeGroup(2)];
    const totalTradesRequired = groups.reduce((sum, group) => sum + group.trades.length, 0);

    return {
        dailyTarget: dailyTargetMonetaryGold,
        totalTradesRequired,
        groups,
    };
  }
};


export const calculateTradePointsLogic = (params: TradeCalculationParams): TradeCalculationResult => {
  const { entryPrice = 0, direction, customTP, customSL, currentBalance, instrumentType } = params;

  const defaultCustomTP = instrumentType === 'volatility75' ? V75_TP_PIPS_IN_PLAN : 500;
  const defaultCustomSL = instrumentType === 'volatility75' ? V75_SL_PIPS_IN_PLAN : 500;

  const actualCustomTP = customTP !== undefined && customTP > 0 ? customTP : defaultCustomTP;
  const actualCustomSL = customSL !== undefined && customSL > 0 ? customSL : defaultCustomSL;

  const pipsToPrice = (pips: number) => {
    if (instrumentType === 'gold') return pips * 0.01;
    return pips;
  }

  let lotsToRecommendString: string;
  let lotPrecision: number;

  if (instrumentType === 'gold') {
      const riskPercentForLotCalc = 0.01;
      const riskAmount = currentBalance * riskPercentForLotCalc;
      let baseLots = riskAmount / (actualCustomSL * 0.1); // Gold: 0.1 USD per pip per 0.01 lots
      baseLots = Math.max(MIN_LOT_SIZE_GOLD, baseLots);
      baseLots = Math.min(MAX_LOT_SIZE_GOLD, baseLots);
      lotPrecision = 2;
      lotsToRecommendString = baseLots.toFixed(lotPrecision);
  } else { // V75
      // Lot size for V75: based on 500 pips = 1% risk principle for general recommendation
      const riskPercentForLotCalc = 0.01;
      let baseLots = (currentBalance * riskPercentForLotCalc) / V75_PIPS_FOR_1_PERCENT_RISK_LOT_CALC;
      baseLots = Math.max(MIN_LOT_SIZE_V75, baseLots);
      baseLots = Math.min(MAX_LOT_SIZE_V75, baseLots);
      lotPrecision = 3;
      lotsToRecommendString = baseLots.toFixed(lotPrecision);
  }

  const tpCustomPriceMove = pipsToPrice(actualCustomTP);
  const slPriceMove = pipsToPrice(actualCustomSL);

  const tpCustomVal = direction === 'rise' ? entryPrice + tpCustomPriceMove : entryPrice - tpCustomPriceMove;
  const sl = direction === 'rise' ? entryPrice - slPriceMove : entryPrice + slPriceMove;

  const pricePrecision = instrumentType === 'gold' ? 2 : 3;

  return {
      tp1000: "-", 
      tp2000: "-", 
      tpCustom: entryPrice > 0 ? tpCustomVal.toFixed(pricePrecision) : "-",
      slPrice: entryPrice > 0 ? sl.toFixed(pricePrecision) : "-",
      calculatedLots: currentBalance > 0 && entryPrice > 0 ? lotsToRecommendString : (0).toFixed(lotPrecision),
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
      // console.warn("Intl.supportedValuesOf('timeZone') failed, using fallback timezones:", e);
    }
  }
  return [
    'UTC', 'GMT', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles',
    'Asia/Tokyo', 'Australia/Sydney', 'Africa/Nairobi', 'Europe/Berlin', 'Asia/Dubai',
  ];
};

export const formatCurrentDateTime = (timeZone?: string): string => {
  if (typeof window === 'undefined') return "Loading time..."; 
  try {
    const options: Intl.DateTimeFormatOptions = {
        timeZone: timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true, 
    };
    return new Date().toLocaleString('en-US', options);
  } catch (error) {
    // console.warn("Timezone error, falling back to local time string:", error);
     const optionsNoError: Intl.DateTimeFormatOptions = { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true,
    };
    return new Date().toLocaleString('en-US', optionsNoError);
  }
};
