
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getLocalStorageItem, setLocalStorageItem, calculateTradeGroupsLogic } from '@/lib/utils';
import type { TradePlan, Metric, InstrumentType } from '@/lib/types';
import { useToast } from './use-toast';
import { useDerivApi } from './use-deriv-api';

const TARGET_BALANCE = 1000000;

// Gold Specific Constants
const MIN_LOT_SIZE_GOLD = 0.01;
const MAX_LOT_SIZE_GOLD = 5.00;
const GOLD_LOT_PRECISION = 2;
const GOLD_STRATEGY_SL_PIPS = 100;
const GOLD_STRATEGY_TP_PIPS = 200;
const GOLD_VALUE_PER_PIP_PER_STANDARD_LOT = 10;

// Volatility 75 Specific Constants
const MIN_LOT_SIZE_V75 = 0.001;
const MAX_LOT_SIZE_V75 = 5.00;
const V75_LOT_PRECISION = 3;
const V75_STRATEGY_SL_PIPS = 1000;
const V75_STRATEGY_TP_PIPS = 2000;
const V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK = 500;
const V75_VALUE_PER_PIP_PER_FULL_LOT = 1;

export function useDashboardState(instrumentType: InstrumentType, initialBalanceDefault: number) {
  const [currentBalance, setCurrentBalance] = useState<number>(initialBalanceDefault);
  const [tradesToday, setTradesToday] = useState<number>(0);
  const [lastTradeDate, setLastTradeDate] = useState<string>('');
  const [tradePlan, setTradePlan] = useState<TradePlan | null>(null);
  const [isShieldActive, setIsShieldActive] = useState<boolean>(false);
  const { toast } = useToast();
  const { balance: derivBalance, syncEnabled } = useDerivApi();

  // Automatically sync with Deriv live WebSocket balance if enabled
  useEffect(() => {
    if (syncEnabled && derivBalance !== null && derivBalance !== currentBalance) {
      const difference = derivBalance - currentBalance;
      const today = new Date().toDateString();
      let updatedTradesToday = tradesToday;

      if (today !== lastTradeDate) {
        updatedTradesToday = 0;
        setLastTradeDate(today);
        setLocalStorageItem(getLsKey('lastTradeDate'), today);
      }

      // If the balance change is significant, log a trade!
      if (Math.abs(difference) >= 0.01) {
        updatedTradesToday++;
        setTradesToday(updatedTradesToday);
        
        // Celebrate a win or log a loss with customized notifications
        if (difference > 0) {
          toast({
            title: "Deriv Sync: Trade Won! 🎉",
            description: `Profits logged: +$${difference.toFixed(2)}. New Balance: $${derivBalance.toFixed(2)}`,
            className: "border-emerald-500/30 bg-emerald-950/80 text-white backdrop-blur-md"
          });
        } else {
          toast({
            title: "Deriv Sync: Trade Completed 📉",
            description: `Loss logged: -$${Math.abs(difference).toFixed(2)}. New Balance: $${derivBalance.toFixed(2)}`,
            variant: "destructive"
          });
        }
      }
      
      setCurrentBalance(derivBalance);
    }
  }, [derivBalance, syncEnabled, currentBalance, tradesToday, lastTradeDate, toast, instrumentType, initialBalanceDefault]);

  const getLsKey = (baseKey: string) => `${instrumentType}_${baseKey}`;

  useEffect(() => {
    setCurrentBalance(getLocalStorageItem<number>(getLsKey('currentBalance'), initialBalanceDefault));
    setTradesToday(getLocalStorageItem<number>(getLsKey('tradesToday'), 0));
    setLastTradeDate(getLocalStorageItem<string>(getLsKey('lastTradeDate'), new Date().toDateString()));
    setIsShieldActive(getLocalStorageItem<boolean>(getLsKey('isShieldActive'), false));
  }, [instrumentType, initialBalanceDefault]);

  const toggleShield = () => {
    // Check if current lot size can be halved meaningfully
    const lotPrecision = instrumentType === 'gold' ? GOLD_LOT_PRECISION : V75_LOT_PRECISION;
    const amountToRisk = currentBalance * 0.01;
    const baseLots = instrumentType === 'gold'
      ? amountToRisk / (GOLD_STRATEGY_SL_PIPS * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT)
      : (currentBalance * 0.01) / V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK;

    // Check for "0.03" style oddity where division exceeds broker precision
    const halved = baseLots / 2;
    const roundedHalved = parseFloat(halved.toFixed(lotPrecision));

    if (roundedHalved < (instrumentType === 'gold' ? MIN_LOT_SIZE_GOLD : MIN_LOT_SIZE_V75)) {
      toast({
        title: "🛡️ Shield Note",
        description: "Standard lot size is already at the minimum allowed. Balance must be higher to further halve for Risk Shield.",
      });
      return;
    }

    const newState = !isShieldActive;
    setIsShieldActive(newState);
    setLocalStorageItem(getLsKey('isShieldActive'), newState);

    toast({
      title: newState ? "Risk Shield Activated 🛡️" : "Standard Risk Restored",
      description: newState
        ? "Lot size halved. SL & TP distances doubled. Total risk remains identical."
        : "Returned to standard 1% risk calculations.",
    });
  };

  const handleUpdateBalance = (newBalance: number) => {
    setCurrentBalance(newBalance);
    setLocalStorageItem(getLsKey('currentBalance'), newBalance);
  };

  const updateTradesDisplay = useCallback(() => {
    if (currentBalance <= 0) return;
    const basePlan = calculateTradeGroupsLogic(currentBalance, instrumentType);
    setTradePlan({
      ...basePlan,
      completedTrades: tradesToday,
      remainingTrades: Math.max(basePlan.totalTradesRequired - tradesToday, 0),
    });
  }, [currentBalance, tradesToday, instrumentType]);

  useEffect(() => { updateTradesDisplay(); }, [updateTradesDisplay]);

  // Metric Calculations
  let dailyTargetValue, riskMetricValue, recLotsString, lotPrecision;

  if (instrumentType === 'volatility75') {
    lotPrecision = V75_LOT_PRECISION;
    const baseLots = (currentBalance * 0.01) / V75_LOT_CALC_BASE_PIPS_FOR_1_PERCENT_RISK;
    let actualLots = parseFloat(Math.max(MIN_LOT_SIZE_V75, Math.min(baseLots, MAX_LOT_SIZE_V75)).toFixed(lotPrecision));

    if (isShieldActive) {
      actualLots = parseFloat((actualLots / 2).toFixed(lotPrecision));
      riskMetricValue = actualLots * (V75_STRATEGY_SL_PIPS * 2) * V75_VALUE_PER_PIP_PER_FULL_LOT;
      dailyTargetValue = actualLots * (V75_STRATEGY_TP_PIPS * 2) * V75_VALUE_PER_PIP_PER_FULL_LOT;
    } else {
      riskMetricValue = actualLots * V75_STRATEGY_SL_PIPS * V75_VALUE_PER_PIP_PER_FULL_LOT;
      dailyTargetValue = actualLots * V75_STRATEGY_TP_PIPS * V75_VALUE_PER_PIP_PER_FULL_LOT;
    }
    recLotsString = actualLots.toFixed(lotPrecision);
  } else {
    lotPrecision = GOLD_LOT_PRECISION;
    const amountToRisk = currentBalance * 0.01;
    const baseLots = amountToRisk / (GOLD_STRATEGY_SL_PIPS * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT);
    let actualLots = parseFloat(Math.max(MIN_LOT_SIZE_GOLD, Math.min(baseLots, MAX_LOT_SIZE_GOLD)).toFixed(lotPrecision));

    if (isShieldActive) {
      actualLots = parseFloat((actualLots / 2).toFixed(lotPrecision));
      riskMetricValue = actualLots * (GOLD_STRATEGY_SL_PIPS * 2) * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;
      dailyTargetValue = actualLots * (GOLD_STRATEGY_TP_PIPS * 2) * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;
    } else {
      riskMetricValue = actualLots * GOLD_STRATEGY_SL_PIPS * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;
      dailyTargetValue = actualLots * GOLD_STRATEGY_TP_PIPS * GOLD_VALUE_PER_PIP_PER_STANDARD_LOT;
    }
    recLotsString = actualLots.toFixed(lotPrecision);
  }

  const riskPercent = currentBalance > 0 ? (riskMetricValue / currentBalance * 100).toFixed(1) : '0.0';
  const targetPercent = currentBalance > 0 ? (dailyTargetValue / currentBalance * 100).toFixed(1) : '0.0';

  const metrics: Metric[] = [
    { label: "Current Balance", value: currentBalance.toFixed(2), unit: "$", id: `${instrumentType}-currentBalance` },
    {
      label: "Days to Target",
      value: currentBalance > 0 && currentBalance < TARGET_BALANCE && dailyTargetValue > 0 && (dailyTargetValue / currentBalance) > 0.0001 ?
        Math.ceil(Math.log(TARGET_BALANCE / currentBalance) / Math.log(1 + (dailyTargetValue / currentBalance)))
        : (currentBalance >= TARGET_BALANCE ? 0 : "-"),
      id: `${instrumentType}-daysRemaining`
    },
    { label: `Today's Target (${targetPercent}%)`, value: dailyTargetValue.toFixed(2), unit: "$", id: `${instrumentType}-dailyTarget` },
    { label: `Trade Risk (${riskPercent}%)`, value: riskMetricValue.toFixed(2), unit: "$", copyable: true, id: `${instrumentType}-stopLossAmount` },
    {
      label: "Rec. Lot Size",
      value: currentBalance > 0 ? recLotsString : (0).toFixed(lotPrecision),
      copyable: true,
      id: `${instrumentType}-lotSize`,
      onAction: toggleShield,
      actionIcon: 'shield',
      isActive: isShieldActive
    },
  ];

  return { currentBalance, tradePlan, metrics, handleUpdateBalance, isShieldActive, toggleShield };
}
