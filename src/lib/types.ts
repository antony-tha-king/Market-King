export interface Metric {
  label: string;
  value: string | number;
  unit?: string;
  copyable?: boolean;
  id?: string;
}

export interface TradeDetail {
  lots: string;
  profit: string;
  percent: string;
  status: '✅ Completed' | '🟡 Pending';
  tradeNumber: number;
}

export interface TradeGroup {
  groupNumber: number;
  trades: TradeDetail[];
  totalLots: string;
}

export interface TradePlan {
  dailyTarget: number;
  totalTradesRequired: number;
  completedTrades: number;
  remainingTrades: number;
  groups: TradeGroup[];
}

export type TradeDirection = "rise" | "fall";

export interface TradeCalculationParams {
  entryPrice?: number;
  direction: TradeDirection;
  customTP?: number; // pips
  customSL?: number; // pips
  currentBalance: number;
  instrumentType: "volatility75" | "gold";
}

export interface TradeCalculationResult {
  tp500: string;
  tp3000: string;
  tpCustom: string;
  slPrice: string;
  calculatedLots: string;
}

export type CompoundingFrequency = "daily" | "monthly" | "yearly";

export interface CompoundingResult {
  projectedBalance: string;
  totalGrowth: string;
}

export interface WithdrawalResult {
  totalGrowth: string;
  withdrawableAmount: string;
}

export type InstrumentType = "volatility75" | "gold";

export interface BaseDashboardProps {
  instrumentType: InstrumentType;
  instrumentName: string;
  initialBalanceOrDefault: number;
}
