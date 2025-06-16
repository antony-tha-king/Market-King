
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getLocalStorageItem, setLocalStorageItem, calculateTradeGroupsLogic } from '@/lib/utils';
import type { TradePlan, Metric, InstrumentType } from '@/lib/types';
import { useToast } from './use-toast';

const TARGET_BALANCE = 1000000;

// Gold Specific Constants
const MIN_LOT_SIZE_GOLD = 0.01;
const MAX_LOT_SIZE_GOLD = 5.00; // User specified max
const GOLD_LOT_PRECISION = 2;
const GOLD_STRATEGY_SL_PIPS = 100;
const GOLD_STRATEGY_TP_PIPS = 200;
const GOLD_VALUE_PER_PIP_PER_STANDARD_LOT = 10; // $10 profit/loss per pip for 1 standard lot of Gold

// Volatility 75 Specific Constants
const MIN_LOT_SIZE_V75 = 0.001;
const MAX_LOT_SIZE_V75 = 5.00;
const V75_LOT_PRECISION = 3;
const V75_STRATEGY_SL_PIPS = 1000; // Risking 1% over these pips
const V75_STRATEGY_TP_PIPS = 2000; // Aiming for 2% gain with these pips
const V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK = 500; // Lot size based on 500 pips = 1% risk
const V75_VALUE_PER_PIP_PER_FULL_LOT = 1; // V75: 1 pip = $1 profit/loss per lot


export function useDashboardState(instrumentType: InstrumentType, initialBalanceDefault: number) {
  const [currentBalance, setCurrentBalance] = useState<number>(initialBalanceDefault);
  const [tradesToday, setTradesToday] = useState<number>(0);
  const [lastTradeDate, setLastTradeDate] = useState<string>('');
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);
  const { toast } = useToast();

  const getLsKey = (baseKey: string) => `${instrumentType}_${baseKey}`;

  useEffect(() => {
    setCurrentBalance(getLocalStorageItem<number>(getLsKey('currentBalance'), initialBalanceDefault));
    setTradesToday(getLocalStorageItem<number>(getLsKey('tradesToday'), 0));
    setLastTradeDate(getLocalStorageItem<string>(getLsKey('lastTradeDate'), new Date().toDateString()));
  }, [instrumentType, initialBalanceDefault]);

  useEffect(() => {
    const today = new Date().toDateString();
    if (today !== lastTradeDate) {
      setTradesToday(0);
      setLastTradeDate(today);
      setLocalStorageItem(getLsKey('tradesToday'), 0);
      setLocalStorageItem(getLsKey('lastTradeDate'), today);
    }
  }, [lastTradeDate, instrumentType]);


  const updateTradesDisplay = useCallback(() => {
    if (currentBalance <= 0) {
      setTradePlan(null);
      return;
    }
    const basePlan = calculateTradeGroupsLogic(currentBalance, instrumentType);
    const updatedGroups = basePlan.groups.map(group => ({
      ...group,
      trades: group.trades.map((trade, index) => {
        let overallTradeIndex = index;
        // Correctly calculate overallTradeIndex based on previous groups' trade counts
        for(let i = 0; i < basePlan.groups.findIndex(g => g.groupNumber === group.groupNumber); i++) {
            overallTradeIndex += basePlan.groups[i].trades.length;
        }
        return {
          ...trade,
          status: tradesToday > overallTradeIndex ? '✅ Completed' : '🟡 Pending',
          tradeNumber: overallTradeIndex, // trade.tradeNumber is already set correctly by calculateTradeGroupsLogic
        } as const;
      })
    }));

    setTradePlan({
      ...basePlan,
      groups: updatedGroups, // Use the updated groups with correct status
      completedTrades: tradesToday,
      remainingTrades: Math.max(basePlan.totalTradesRequired - tradesToday, 0),
    });
  }, [currentBalance, tradesToday, instrumentType]);


  useEffect(() => {
    updateTradesDisplay();
  }, [updateTradesDisplay]);


  useEffect(() => {
    setLocalStorageItem(getLsKey('currentBalance'), currentBalance);
    updateTradesDisplay();
  }, [currentBalance, instrumentType, updateTradesDisplay]);

  useEffect(() => {
    setLocalStorageItem(getLsKey('tradesToday'), tradesToday);
    updateTradesDisplay();
  }, [tradesToday, instrumentType, updateTradesDisplay]);


  const handleUpdateBalance = (newBalance: number) => {
    const today = new Date().toDateString();
    let updatedTradesToday = tradesToday;

    if (today !== lastTradeDate) {
      updatedTradesToday = 0;
      setLastTradeDate(today);
      setLocalStorageItem(getLsKey('lastTradeDate'), today);
    }
    
    if (newBalance !== currentBalance || getLocalStorageItem<number>(getLsKey('currentBalance'), initialBalanceDefault) !== newBalance ) {
        updatedTradesToday++;
    }

    setTradesToday(updatedTradesToday);
    setCurrentBalance(newBalance);
  };

  const checkEndOfMonthReminder = useCallback(() => {
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    if (today.getDate() === lastDayOfMonth) {
      const reminderKey = `eomReminder_${today.getFullYear()}_${today.getMonth()}`;
      if (!getLocalStorageItem(reminderKey, false)) {
        toast({
            title: "End of Month Reminder",
            description: "Don't forget to consider your profits!",
            duration: 10000,
        });
        setLocalStorageItem(reminderKey, true);
      }
    }
  }, [toast]);

  useEffect(() => {
    checkEndOfMonthReminder();
    const intervalId = setInterval(checkEndOfMonthReminder, 1000 * 60 * 60 * 6); 
    return () => clearInterval(intervalId);
  }, [checkEndOfMonthReminder]);

  let dailyTargetLabel = "Today's Target";
  let dailyTargetValue = 0;
  let riskMetricLabel = "Trade Risk";
  let riskMetricValue = 0;
  let recLotsString: string;
  let lotPrecision: number;

  if (instrumentType === 'volatility75') {
    lotPrecision = V75_LOT_PRECISION;
    const baseLotsV75 = (currentBalance * 0.01) / V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK;
    const actualRecLotsV75 = parseFloat(
      Math.max(MIN_LOT_SIZE_V75, Math.min(baseLotsV75, MAX_LOT_SIZE_V75)).toFixed(lotPrecision)
    );
    recLotsString = actualRecLotsV75.toFixed(lotPrecision);

    // Actual monetary risk and target based on rounded lot size and V75 strategy pips
    riskMetricValue = actualRecLotsV75 * V75_STRATEGY_SL_PIPS * V75_VALUE_PER_PIP_PER_FULL_LOT;
    dailyTargetValue = actualRecLotsV75 * V75_STRATEGY_TP_PIPS * V75_VALUE_PER_PIP_PER_FULL_LOT;

    const riskPercent = currentBalance > 0 ? (riskMetricValue / currentBalance * 100).toFixed(1) : '0.0';
    const targetPercent = currentBalance > 0 ? (dailyTargetValue / currentBalance * 100).toFixed(1) : '0.0';

    dailyTargetLabel = `Today's Target (${targetPercent}%)`;
    riskMetricLabel = `Trade Risk (${riskPercent}%)`;

  } else { // Gold
    lotPrecision = GOLD_LOT_PRECISION;
    const amountToRiskGold = currentBalance * 0.01; // Risk 1%
    const baseLotsGold = amountToRiskGold / (GOLD_STRATEGY_SL_PIPS * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT);
    const actualRecLotsGold = parseFloat(
      Math.max(MIN_LOT_SIZE_GOLD, Math.min(baseLotsGold, MAX_LOT_SIZE_GOLD)).toFixed(lotPrecision)
    );
    recLotsString = actualRecLotsGold.toFixed(lotPrecision);

    riskMetricValue = actualRecLotsGold * GOLD_STRATEGY_SL_PIPS * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;
    dailyTargetValue = actualRecLotsGold * GOLD_STRATEGY_TP_PIPS * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;
    
    const riskPercent = currentBalance > 0 ? (riskMetricValue / currentBalance * 100).toFixed(1) : '0.0';
    const targetPercent = currentBalance > 0 ? (dailyTargetValue / currentBalance * 100).toFixed(1) : '0.0';

    dailyTargetLabel = `Today's Target (${targetPercent}%)`;
    riskMetricLabel = `Trade Risk (${riskPercent}%)`;
  }

  const metrics: Metric[] = [
    { label: "Current Balance", value: currentBalance.toFixed(2), unit: "$", id: `${instrumentType}-currentBalance` },
    {
      label: "Days to Target",
      value: currentBalance > 0 && currentBalance < TARGET_BALANCE && dailyTargetValue > 0 && (dailyTargetValue / currentBalance) > 0.0001 ? // ensure target is meaningful positive growth
             Math.ceil(Math.log(TARGET_BALANCE / currentBalance) / Math.log(1 + (dailyTargetValue / currentBalance)))
             : (currentBalance >= TARGET_BALANCE ? 0 : "-"),
      id: `${instrumentType}-daysRemaining`
    },
    { label: dailyTargetLabel, value: dailyTargetValue.toFixed(2), unit: "$", id: `${instrumentType}-dailyTarget` },
    {
      label: riskMetricLabel,
      value: riskMetricValue.toFixed(2),
      unit: "$",
      copyable: true,
      id: `${instrumentType}-stopLossAmount`
    },
    {
      label: "Rec. Lot Size",
      value: currentBalance > 0 ? recLotsString : (0).toFixed(lotPrecision),
      copyable: true,
      id: `${instrumentType}-lotSize`
    },
  ];

  return {
    currentBalance,
    tradesToday,
    tradePlan,
    metrics,
    handleUpdateBalance,
  };
}
