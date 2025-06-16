
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
const MAX_LOT_SIZE_GOLD = 5; // User specified
const GOLD_LOT_PRECISION = 2;
const GOLD_PIP_TO_PRICE_FACTOR = 0.01; // 1 pip = $0.01 price move for Gold
const GOLD_VALUE_PER_PIP_PER_FULL_LOT = 1; // $1 profit/loss per pip for 1 full lot of Gold
const GOLD_PIPS_FOR_TRADE_PLAN_PROFIT_CALC = 500; // From JS, for trade plan profit calc
const GOLD_LOT_CALC_DIVISOR_FOR_METRIC = 500; // From JS: lot size for dashboard metric based on 500 pips = 1% risk

// Volatility 75 Specific Constants
const MIN_LOT_SIZE_V75 = 0.001;
const MAX_LOT_SIZE_V75 = 5;
const V75_LOT_PRECISION = 3;
const V75_STRATEGY_SL_PIPS = 1000;
const V75_STRATEGY_TP_PIPS = 2000;
const V75_LOT_CALC_DIVISOR_FOR_METRIC = 500; // Lot size for dashboard metric based on 500 pips = 1% risk
const V75_VALUE_PER_PIP_PER_FULL_LOT = 1; // V75: 1 pip = $1 profit/loss per lot


export const calculateTradeGroupsLogic = (currentBalance: number, instrumentType: InstrumentType): Omit<TradePlan, 'completedTrades' | 'remainingTrades'> => {
  if (currentBalance <= 0) {
    return { dailyTarget: 0, totalTradesRequired: 0, groups: [] };
  }

  if (instrumentType === 'volatility75') {
    const riskPercentForLot = 0.01; // For lot sizing rule (500 pips = 1% risk)
    let baseLots = (currentBalance * riskPercentForLot) / V75_LOT_CALC_DIVISOR_FOR_METRIC;
    
    let lotsForTrade = parseFloat(
      Math.max(MIN_LOT_SIZE_V75, Math.min(baseLots, MAX_LOT_SIZE_V75)).toFixed(V75_LOT_PRECISION)
    );

    const profitForTrade = lotsForTrade * V75_STRATEGY_TP_PIPS * V75_VALUE_PER_PIP_PER_FULL_LOT;
    const percentForTrade = currentBalance > 0 ? (profitForTrade / currentBalance) * 100 : 0;

    const tradeDetail: TradeDetail = {
      lots: lotsForTrade.toFixed(V75_LOT_PRECISION),
      profit: profitForTrade.toFixed(2),
      percent: percentForTrade.toFixed(2),
      status: '🟡 Pending',
      tradeNumber: 0, // Will be updated
    };

    const group: TradeGroup = {
      groupNumber: 1,
      trades: [tradeDetail],
      totalLots: lotsForTrade.toFixed(V75_LOT_PRECISION),
    };
    
    const dailyTargetMonetary = profitForTrade; // Actual gain from the single V75 strategy trade

    return {
      dailyTarget: dailyTargetMonetary,
      totalTradesRequired: 1,
      groups: [group],
    };

  } else { // Gold logic (mirroring JS structure)
    const DAILY_TARGET_PERCENT_GOLD = 0.02;
    const dailyTargetMonetaryGold = currentBalance * DAILY_TARGET_PERCENT_GOLD;
    const targetProfitPerGroup = currentBalance * 0.01; // Each of the 2 groups aims for 1%

    // Calculate the total lots needed for one group to achieve 1% profit with 500 pips
    let groupBaseLots = targetProfitPerGroup / (GOLD_PIPS_FOR_TRADE_PLAN_PROFIT_CALC * GOLD_VALUE_PER_PIP_PER_FULL_LOT);
    groupBaseLots = Math.max(groupBaseLots, MIN_LOT_SIZE_GOLD); // Ensure at least min lot

    const createTradeGroupForGold = (groupNumber: number): TradeGroup => {
        const trades: TradeDetail[] = [];
        let remainingLotsForGroup = groupBaseLots;
        let tradeCounterInGroup = 0;

        while (remainingLotsForGroup > 0 && tradeCounterInGroup < 100) { // Safety break for loop
            const lotsForThisTrade = parseFloat(
              Math.min(MAX_LOT_SIZE_GOLD, Math.max(remainingLotsForGroup, MIN_LOT_SIZE_GOLD)).toFixed(GOLD_LOT_PRECISION)
            );
            
            if (lotsForThisTrade < MIN_LOT_SIZE_GOLD && trades.length === 0) { // if first trade is too small
                 trades.push({
                    lots: MIN_LOT_SIZE_GOLD.toFixed(GOLD_LOT_PRECISION),
                    profit: (MIN_LOT_SIZE_GOLD * GOLD_PIPS_FOR_TRADE_PLAN_PROFIT_CALC * GOLD_VALUE_PER_PIP_PER_FULL_LOT).toFixed(2),
                    percent: ((MIN_LOT_SIZE_GOLD * GOLD_PIPS_FOR_TRADE_PLAN_PROFIT_CALC * GOLD_VALUE_PER_PIP_PER_FULL_LOT / currentBalance) * 100).toFixed(2),
                    status: '🟡 Pending', tradeNumber: 0,
                 });
                 remainingLotsForGroup = 0; // Exit loop
            } else if (lotsForThisTrade >= MIN_LOT_SIZE_GOLD) {
                 trades.push({
                    lots: lotsForThisTrade.toFixed(GOLD_LOT_PRECISION),
                    profit: (lotsForThisTrade * GOLD_PIPS_FOR_TRADE_PLAN_PROFIT_CALC * GOLD_VALUE_PER_PIP_PER_FULL_LOT).toFixed(2),
                    percent: ((lotsForThisTrade * GOLD_PIPS_FOR_TRADE_PLAN_PROFIT_CALC * GOLD_VALUE_PER_PIP_PER_FULL_LOT / currentBalance) * 100).toFixed(2),
                    status: '🟡 Pending', tradeNumber: 0,
                });
                remainingLotsForGroup = parseFloat((remainingLotsForGroup - lotsForThisTrade).toFixed(GOLD_LOT_PRECISION + 1)); // reduce remaining
            } else {
                break; // remaining is too small for a min lot trade
            }
            tradeCounterInGroup++;
        }
         // If no trades were created (e.g. groupBaseLots was too small), create one with min lot.
        if (trades.length === 0) {
            const minLotProfit = MIN_LOT_SIZE_GOLD * GOLD_PIPS_FOR_TRADE_PLAN_PROFIT_CALC * GOLD_VALUE_PER_PIP_PER_FULL_LOT;
            trades.push({
                lots: MIN_LOT_SIZE_GOLD.toFixed(GOLD_LOT_PRECISION),
                profit: minLotProfit.toFixed(2),
                percent: ((minLotProfit / currentBalance) * 100).toFixed(2),
                status: '🟡 Pending', tradeNumber: 0,
            });
        }

        const totalLotsForGroup = trades.reduce((sum, trade) => sum + parseFloat(trade.lots), 0);
        return {
            groupNumber,
            trades,
            totalLots: totalLotsForGroup.toFixed(GOLD_LOT_PRECISION),
        };
    };

    const groups = [createTradeGroupForGold(1), createTradeGroupForGold(2)];
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

  let lotsToRecommendString: string;
  let lotPrecision: number;
  let pipToPriceFactor: number;
  let valuePerPipPerFullLot: number;
  let defaultSL: number;
  let defaultTP: number;
  let minLot: number;
  let maxLot: number;
  let lotCalcDivisor: number;

  if (instrumentType === 'gold') {
    lotPrecision = GOLD_LOT_PRECISION;
    pipToPriceFactor = GOLD_PIP_TO_PRICE_FACTOR;
    valuePerPipPerFullLot = GOLD_VALUE_PER_PIP_PER_FULL_LOT;
    defaultSL = 100; // Gold Strategy SL
    defaultTP = 200; // Gold Strategy TP
    minLot = MIN_LOT_SIZE_GOLD;
    maxLot = MAX_LOT_SIZE_GOLD;
    lotCalcDivisor = GOLD_LOT_CALC_DIVISOR_FOR_METRIC;
  } else { // Volatility75
    lotPrecision = V75_LOT_PRECISION;
    pipToPriceFactor = 1; // For V75, 1 pip is 1 price unit
    valuePerPipPerFullLot = V75_VALUE_PER_PIP_PER_FULL_LOT;
    defaultSL = V75_STRATEGY_SL_PIPS;
    defaultTP = V75_STRATEGY_TP_PIPS;
    minLot = MIN_LOT_SIZE_V75;
    maxLot = MAX_LOT_SIZE_V75;
    lotCalcDivisor = V75_LOT_CALC_DIVISOR_FOR_METRIC;
  }

  const actualCustomTP = customTP !== undefined && customTP > 0 ? customTP : defaultTP;
  const actualCustomSL = customSL !== undefined && customSL > 0 ? customSL : defaultSL;

  // Lot calculation based on 1% risk over `lotCalcDivisor` pips (e.g., 500 pips from JS)
  const baseLotsForCalculator = (currentBalance * 0.01) / lotCalcDivisor;
  lotsToRecommendString = parseFloat(
      Math.max(minLot, Math.min(baseLotsForCalculator, maxLot)).toFixed(lotPrecision)
  ).toFixed(lotPrecision);


  const tpCustomPriceMove = actualCustomTP * pipToPriceFactor;
  const slPriceMove = actualCustomSL * pipToPriceFactor;

  const tpCustomVal = direction === 'rise' ? entryPrice + tpCustomPriceMove : entryPrice - tpCustomPriceMove;
  const slVal = direction === 'rise' ? entryPrice - slPriceMove : entryPrice + slPriceMove;

  // Determine price precision based on entryPrice or fallback for instrument type
  let pricePrecision = instrumentType === 'gold' ? 2 : 3; // Default for Gold is 2, V75 is 3
  if (entryPrice !== 0 && entryPrice.toString().includes('.')) {
      pricePrecision = entryPrice.toString().split('.')[1]?.length || (instrumentType === 'gold' ? 2 : 3);
  }


  return {
      tpCustom: entryPrice > 0 ? tpCustomVal.toFixed(pricePrecision) : "-",
      slPrice: entryPrice > 0 ? slVal.toFixed(pricePrecision) : "-",
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
      // Assuming 20 trading days in a month for compounding calc, can be adjusted
      case 'monthly': days = periods * 20; break; 
      // Assuming 250 trading days in a year for compounding calc, can be adjusted
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
  const daysInPeriod = 30; // Aligning with JS: 30 days for withdrawal growth calculation

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
  // Fallback list if Intl.supportedValuesOf is not available or fails
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
