
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getLocalStorageItem, setLocalStorageItem, calculateTradeGroupsLogic } from '@/lib/utils';
import type { TradePlan, Metric, InstrumentType } from '@/lib/types';
import { useToast } from './use-toast';

const TARGET_BALANCE = 1000000;
const MIN_LOT_SIZE_GOLD_METRIC = 0.01;
const MAX_LOT_SIZE_GOLD_METRIC = 10;
const MIN_LOT_SIZE_V75_METRIC = 0.001;
const MAX_LOT_SIZE_V75_METRIC = 5;
const V75_SL_PIPS_FOR_METRIC_CALC = 1000; // For 1% risk calculation for V75 metric
const GOLD_SL_PIPS_FOR_METRIC_CALC = 50;  // For 1% risk calculation for Gold metric (example)


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
      groups: updatedGroups,
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


  const metrics: Metric[] = [
    { label: "Current Balance", value: currentBalance.toFixed(2), unit: "$", id: `${instrumentType}-currentBalance` },
    { 
      label: "Days to Target", 
      value: currentBalance > 0 && currentBalance < TARGET_BALANCE ? Math.ceil(Math.log(TARGET_BALANCE / currentBalance) / Math.log(1.02)) : (currentBalance >= TARGET_BALANCE ? 0 : "-"),
      id: `${instrumentType}-daysRemaining`
    },
    { label: "Today's Target (2%)", value: (currentBalance * 0.02).toFixed(2), unit: "$", id: `${instrumentType}-dailyTarget` },
    { 
      label: instrumentType === 'volatility75' ? "Max Risk per Trade (1%)" : "Stop Loss (5%)", 
      value: instrumentType === 'volatility75' ? (currentBalance * 0.01).toFixed(2) : (currentBalance * 0.05).toFixed(2), 
      unit: "$", 
      copyable: true, 
      id: `${instrumentType}-stopLossAmount` 
    },
    { 
      label: "Rec. Lot Size", 
      value: (() => {
        const riskPercent = 0.01; // Always 1% risk for this metric calculation
        let recLots;
        let lotPrecision;

        if (instrumentType === 'gold') {
          // Lot size for 1% risk over GOLD_SL_PIPS_FOR_METRIC_CALC pips
          recLots = Math.max(MIN_LOT_SIZE_GOLD_METRIC, (currentBalance * riskPercent) / (GOLD_SL_PIPS_FOR_METRIC_CALC * 0.1)); // Factor 0.1 for pip value
          recLots = Math.min(recLots, MAX_LOT_SIZE_GOLD_METRIC);
          lotPrecision = 2;
        } else { // Volatility 75
          // Lot size for 1% risk over V75_SL_PIPS_FOR_METRIC_CALC (1000) pips
          recLots = Math.max(MIN_LOT_SIZE_V75_METRIC, (currentBalance * riskPercent) / V75_SL_PIPS_FOR_METRIC_CALC);
          recLots = Math.min(recLots, MAX_LOT_SIZE_V75_METRIC);
          lotPrecision = 3;
        }
        return currentBalance > 0 ? recLots.toFixed(lotPrecision) : (0).toFixed(lotPrecision);
      })(), 
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
