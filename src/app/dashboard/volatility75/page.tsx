"use client";

import { useDashboardState } from "@/hooks/use-dashboard-state";
import { MetricGrid } from "@/components/dashboard/common/metric-display";
import { ProgressSection } from "@/components/dashboard/common/progress-section";
import { TimezoneSelector } from "@/components/dashboard/common/timezone-selector";
import { TradeManagementSection } from "@/components/dashboard/common/trade-management-section";
import { TradeCalculatorSection } from "@/components/dashboard/common/trade-calculator-section";
import { CompoundingCalculatorSection } from "@/components/dashboard/common/compounding-calculator-section";
import { WithdrawalCalculatorSection } from "@/components/dashboard/common/withdrawal-calculator-section";
import { Skeleton } from "@/components/ui/skeleton";

const INSTRUMENT_TYPE = "volatility75";
const INSTRUMENT_NAME = "Volatility 75";
const INITIAL_BALANCE_DEFAULT = 50;

export default function Volatility75Page() {
  const {
    currentBalance,
    tradePlan,
    metrics,
    handleUpdateBalance,
  } = useDashboardState(INSTRUMENT_TYPE, INITIAL_BALANCE_DEFAULT);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-primary font-headline tracking-tight">
        {INSTRUMENT_NAME} Dashboard
      </h1>
      
      <MetricGrid metrics={metrics} />
      
      <ProgressSection
        currentBalance={currentBalance}
        onUpdateBalance={handleUpdateBalance}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TimezoneSelector />
        {tradePlan ? (
          <TradeManagementSection tradePlan={tradePlan} />
        ) : (
          <Skeleton className="h-[400px] w-full" />
        )}
      </div>
      
      <TradeCalculatorSection
        currentBalance={currentBalance}
        instrumentType={INSTRUMENT_TYPE}
        instrumentName={INSTRUMENT_NAME}
      />
      
      <CompoundingCalculatorSection />
      
      <WithdrawalCalculatorSection />
    </div>
  );
}
