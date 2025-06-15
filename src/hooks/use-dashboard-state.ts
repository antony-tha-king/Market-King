
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getLocalStorageItem, setLocalStorageItem, calculateTradeGroupsLogic } from '@/lib/utils';
import type { TradePlan, Metric, InstrumentType } from '@/lib/types';
import { useToast } from './use-toast';

const TARGET_BALANCE = 1000000;

const MIN_LOT_SIZE_GOLD_METRIC = 0.01;
const MAX_LOT_SIZE_GOLD_METRIC = 10;
const GOLD_SL_PIPS_FOR_METRIC_CALC = 50; // For 1% risk calculation for Gold metric

const MIN_LOT_SIZE_V75_METRIC = 0.001;
const MAX_LOT_SIZE_V75_METRIC = 5;
const V75_PIPS_FOR_1_PERCENT_RISK_LOT_CALC = 500; // Lot size based on 500 pips = 1% risk principle
const V75_SL_PIPS_IN_PLAN = 1000; // Actual SL used in V75 trade plan
const V75_TP_PIPS_IN_PLAN = 2000; // Actual TP used in V75 trade plan


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
        for(let i = 0; i < group.groupNumber -1; i++) {
            if(basePlan.groups[i]) {
                overallTradeIndex += basePlan.groups[i].trades.length;
            }
        }
        return {
          ...trade,
          status: tradesToday > overallTradeIndex ? '✅ Completed' : '🟡 Pending',
          tradeNumber: overallTradeIndex,
        } as const;
      })
    }));

    setTradePlan({
      ...basePlan,
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

    if (newBalance !== currentBalance) {
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

  let dailyTargetLabel = "Today's Target (2%)";
  let dailyTargetValue = (currentBalance * 0.02);
  let riskMetricLabel = "Stop Loss (5%)";
  let riskMetricValue = (currentBalance * 0.05);
  let recLotsString: string;
  let lotPrecision: number;

  if (instrumentType === 'volatility75') {
    const baseLotsForV75 = (currentBalance * 0.01) / V75_PIPS_FOR_1_PERCENT_RISK_LOT_CALC;
    let preciseRecLotsValue = Math.max(MIN_LOT_SIZE_V75_METRIC, baseLotsForV75);
    preciseRecLotsValue = Math.min(MAX_LOT_SIZE_V75_METRIC, preciseRecLotsValue);
    
    lotPrecision = 3;
    recLotsString = preciseRecLotsValue.toFixed(lotPrecision);
    const actualRecLotsUsedForCalc = parseFloat(recLotsString);

    const potentialGain = actualRecLotsUsedForCalc * V75_TP_PIPS_IN_PLAN;
    const potentialRisk = actualRecLotsUsedForCalc * V75_SL_PIPS_IN_PLAN;

    dailyTargetLabel = `Today's Target (${currentBalance > 0 ? ((potentialGain / currentBalance) * 100).toFixed(1) : '0.0'}%)`;
    dailyTargetValue = currentBalance > 0 ? potentialGain : 0;
    
    riskMetricLabel = `Trade Risk (${currentBalance > 0 ? ((potentialRisk / currentBalance) * 100).toFixed(1) : '0.0'}%)`;
    riskMetricValue = currentBalance > 0 ? potentialRisk : 0;

  } else { // Gold
    const riskAmountGold = currentBalance * 0.01;
    const baseLotsGold = riskAmountGold / (GOLD_SL_PIPS_FOR_METRIC_CALC * 0.1);
    let preciseRecLotsValue = Math.max(MIN_LOT_SIZE_GOLD_METRIC, baseLotsGold);
    preciseRecLotsValue = Math.min(MAX_LOT_SIZE_GOLD_METRIC, preciseRecLotsValue);
    
    lotPrecision = 2;
    recLotsString = preciseRecLotsValue.toFixed(lotPrecision);
  }

  const metrics: Metric[] = [
    { label: "Current Balance", value: currentBalance.toFixed(2), unit: "$", id: `${instrumentType}-currentBalance` },
    {
      label: "Days to Target",
      value: currentBalance > 0 && currentBalance < TARGET_BALANCE ? Math.ceil(Math.log(TARGET_BALANCE / currentBalance) / Math.log(1.02)) : (currentBalance >= TARGET_BALANCE ? 0 : "-"),
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
