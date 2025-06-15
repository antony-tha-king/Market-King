"use client";

import { useState, useEffect, useCallback } from 'react';
import { getLocalStorageItem, setLocalStorageItem, calculateTradeGroupsLogic } from '@/lib/utils';
import type { TradePlan, Metric, InstrumentType } from '@/lib/types';
import { useToast } from './use-toast';

const TARGET_BALANCE = 1000000;

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
      setTradePlan(null); // Or some default empty state
      return;
    }
    const basePlan = calculateTradeGroupsLogic(currentBalance, instrumentType);
    const updatedGroups = basePlan.groups.map(group => ({
      ...group,
      trades: group.trades.map((trade, index) => {
        const overallTradeIndex = group.groupNumber === 1 ? index : basePlan.groups[0].trades.length + index;
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
    updateTradesDisplay(); // Re-calculate trade plan when balance changes
  }, [currentBalance, instrumentType, updateTradesDisplay]);

  useEffect(() => {
    setLocalStorageItem(getLsKey('tradesToday'), tradesToday);
    updateTradesDisplay(); // Re-calculate trade status when tradesToday changes
  }, [tradesToday, instrumentType, updateTradesDisplay]);


  const handleUpdateBalance = (newBalance: number) => {
    const today = new Date().toDateString();
    let updatedTradesToday = tradesToday;

    if (today !== lastTradeDate) {
      updatedTradesToday = 0; // Reset trades for the new day
      setLastTradeDate(today);
      setLocalStorageItem(getLsKey('lastTradeDate'), today);
    }
    
    // Increment tradesToday only if balance has changed meaningfully (e.g. after a trade)
    // The original logic increments tradesToday whenever updateBalance is called with a new balance.
    // Let's assume a trade was made if balance is updated.
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
    const intervalId = setInterval(checkEndOfMonthReminder, 1000 * 60 * 60 * 6); // Check every 6 hours
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
    { label: "Stop Loss (5%)", value: (currentBalance * 0.05).toFixed(2), unit: "$", copyable: true, id: `${instrumentType}-stopLossAmount` },
    { 
      label: "Rec. Lot Size", 
      value: (instrumentType === 'gold' ? Math.max(0.01, currentBalance * 0.01 / 50) : Math.max(0.01, currentBalance * 0.01 / 500)).toFixed(3), 
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
