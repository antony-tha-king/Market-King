
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

// Gold Specific Constants
const MIN_LOT_SIZE_GOLD = 0.01;
const MAX_LOT_SIZE_GOLD = 5.00; 
const GOLD_LOT_PRECISION = 2;
const GOLD_PIP_TO_PRICE_FACTOR = 0.10; // 1 pip = $0.10 price move for Gold
const GOLD_VALUE_PER_PIP_PER_STANDARD_LOT = 10; // $10 profit/loss per pip for 1 standard lot of Gold
const GOLD_STRATEGY_SL_PIPS_FOR_PLAN = 100; // SL pips for trade plan logic
const GOLD_STRATEGY_TP_PIPS_FOR_PLAN = 200; // TP pips for trade plan logic


// Volatility 75 Specific Constants
const MIN_LOT_SIZE_V75 = 0.001;
const MAX_LOT_SIZE_V75 = 5.00;
const V75_LOT_PRECISION = 3;
const V75_STRATEGY_SL_PIPS_FOR_PLAN = 1000;
const V75_STRATEGY_TP_PIPS_FOR_PLAN = 2000;
const V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK = 500; // Lot size based on 500 pips = 1% risk
const V75_VALUE_PER_PIP_PER_FULL_LOT = 1; // V75: 1 pip = $1 profit/loss per lot


export const calculateTradeGroupsLogic = (currentBalance: number, instrumentType: InstrumentType): Omit<TradePlan, 'completedTrades' | 'remainingTrades'> => {
  if (currentBalance <= 0) {
    return { dailyTarget: 0, totalTradesRequired: 0, groups: [] };
  }

  if (instrumentType === 'volatility75') {
    const baseLots = (currentBalance * 0.01) / V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK;
    const lotsForTrade = parseFloat(
      Math.max(MIN_LOT_SIZE_V75, Math.min(baseLots, MAX_LOT_SIZE_V75)).toFixed(V75_LOT_PRECISION)
    );

    const profitForTrade = lotsForTrade * V75_STRATEGY_TP_PIPS_FOR_PLAN * V75_VALUE_PER_PIP_PER_FULL_LOT;
    const percentForTrade = currentBalance > 0 ? (profitForTrade / currentBalance) * 100 : 0;

    const tradeDetail: TradeDetail = {
      lots: lotsForTrade.toFixed(V75_LOT_PRECISION),
      profit: profitForTrade.toFixed(2),
      percent: percentForTrade.toFixed(2),
      status: '🟡 Pending',
      tradeNumber: 0, 
    };

    const group: TradeGroup = {
      groupNumber: 1,
      trades: [tradeDetail],
      totalLots: lotsForTrade.toFixed(V75_LOT_PRECISION),
    };
    
    return {
      dailyTarget: profitForTrade, // Actual gain from the V75 strategy trade
      totalTradesRequired: 1,
      groups: [group],
    };

  } else { // Gold logic: Simplified to one trade risking 1% for 2% gain
    const amountToRisk = currentBalance * 0.01;
    const baseLotsGold = amountToRisk / (GOLD_STRATEGY_SL_PIPS_FOR_PLAN * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT);
    const lotsForTrade = parseFloat(
      Math.max(MIN_LOT_SIZE_GOLD, Math.min(baseLotsGold, MAX_LOT_SIZE_GOLD)).toFixed(GOLD_LOT_PRECISION)
    );

    const profitForTrade = lotsForTrade * GOLD_STRATEGY_TP_PIPS_FOR_PLAN * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;
    const percentForTrade = currentBalance > 0 ? (profitForTrade / currentBalance) * 100 : 0;
    
    const tradeDetail: TradeDetail = {
      lots: lotsForTrade.toFixed(GOLD_LOT_PRECISION),
      profit: profitForTrade.toFixed(2),
      percent: percentForTrade.toFixed(2),
      status: '🟡 Pending',
      tradeNumber: 0,
    };

    const group: TradeGroup = {
      groupNumber: 1,
      trades: [tradeDetail],
      totalLots: lotsForTrade.toFixed(GOLD_LOT_PRECISION),
    };

    return {
        dailyTarget: profitForTrade, // Actual 2% gain from the Gold strategy trade
        totalTradesRequired: 1,
        groups: [group],
    };
  }
};


export const calculateTradePointsLogic = (params: TradeCalculationParams): TradeCalculationResult => {
  const { entryPrice = 0, direction, customTP, customSL, currentBalance, instrumentType } = params;

  let calculatedLotsString: string;
  let lotPrecision: number;
  let pipToPriceFactor: number;
  let defaultSLPips: number;
  let defaultTPPips: number;
  let minLot: number;
  let maxLot: number;
  let valuePerPipPerLotForCalc: number; // Value per pip for 1 standard lot for the instrument


  if (instrumentType === 'gold') {
    lotPrecision = GOLD_LOT_PRECISION;
    pipToPriceFactor = GOLD_PIP_TO_PRICE_FACTOR;
    defaultSLPips = GOLD_STRATEGY_SL_PIPS_FOR_PLAN;
    defaultTPPips = GOLD_STRATEGY_TP_PIPS_FOR_PLAN;
    minLot = MIN_LOT_SIZE_GOLD;
    maxLot = MAX_LOT_SIZE_GOLD;
    valuePerPipPerLotForCalc = GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;

    const slPipsForLot = customSL !== undefined && customSL > 0 ? customSL : defaultSLPips;
    const amountToRisk = currentBalance * 0.01; // Risk 1% of balance
    const baseLots = amountToRisk / (slPipsForLot * valuePerPipPerLotForCalc);
    calculatedLotsString = parseFloat(
      Math.max(minLot, Math.min(baseLots, maxLot)).toFixed(lotPrecision)
    ).toFixed(lotPrecision);

  } else { // Volatility75
    lotPrecision = V75_LOT_PRECISION;
    pipToPriceFactor = 1; // For V75, 1 pip is 1 price unit
    defaultSLPips = V75_STRATEGY_SL_PIPS_FOR_PLAN;
    defaultTPPips = V75_STRATEGY_TP_PIPS_FOR_PLAN;
    minLot = MIN_LOT_SIZE_V75;
    maxLot = MAX_LOT_SIZE_V75;
    valuePerPipPerLotForCalc = V75_VALUE_PER_PIP_PER_FULL_LOT;
    
    // V75 lot calculation is based on 500 pips = 1% risk for its "recommended lot"
    const baseLots = (currentBalance * 0.01) / V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK;
     calculatedLotsString = parseFloat(
      Math.max(minLot, Math.min(baseLots, maxLot)).toFixed(lotPrecision)
    ).toFixed(lotPrecision);
  }

  const actualCustomTP = customTP !== undefined && customTP > 0 ? customTP : defaultTPPips;
  const actualCustomSL = customSL !== undefined && customSL > 0 ? customSL : defaultSLPips;

  const tpCustomPriceMove = actualCustomTP * pipToPriceFactor;
  const slPriceMove = actualCustomSL * pipToPriceFactor;

  const tpCustomVal = direction === 'rise' ? entryPrice + tpCustomPriceMove : entryPrice - tpCustomPriceMove;
  const slVal = direction === 'rise' ? entryPrice - slPriceMove : entryPrice + slPriceMove;

  let pricePrecision = instrumentType === 'gold' ? 2 : (entryPrice.toString().split('.')[1]?.length || 3);
   if (entryPrice === 0) { // If entry price is 0, use default precision
    pricePrecision = instrumentType === 'gold' ? 2 : 3;
  } else if (entryPrice.toString().includes('.')) {
    pricePrecision = entryPrice.toString().split('.')[1]?.length || (instrumentType === 'gold' ? 2 : 3);
  } else { // Whole number entry price
    pricePrecision = instrumentType === 'gold' ? 2 : 0; // Gold usually has decimals, V75 might not
    if (instrumentType === 'volatility75' && pricePrecision === 0) pricePrecision = 1; // V75 point often needs 1 decimal
  }


  return {
      tpCustom: entryPrice > 0 ? tpCustomVal.toFixed(pricePrecision) : "-",
      slPrice: entryPrice > 0 ? slVal.toFixed(pricePrecision) : "-",
      calculatedLots: currentBalance > 0 && entryPrice > 0 ? calculatedLotsString : (0).toFixed(lotPrecision),
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
  const daysInPeriod = 30; // Use 30 actual days for reversing growth

  for (let i = 0; i < daysInPeriod; i++) {
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
    'UTC', 'GMT', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'Asia/Tokyo', 'Asia/Dubai', 'Asia/Kolkata', 
    'Australia/Sydney', 'Australia/Melbourne',
    'Africa/Johannesburg', 'Africa/Nairobi',
    'Pacific/Auckland', 'Pacific/Honolulu',
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

