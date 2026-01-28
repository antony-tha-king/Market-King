"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { TradePlan, TradeGroup, TradeDetail } from "@/lib/types";
import { CheckCircle2, CircleDotDashed } from "lucide-react";

interface TradeManagementSectionProps {
  tradePlan: TradePlan;
}

const TradeStatusIcon = ({ status }: { status: TradeDetail['status'] }) => {
  if (status === "✅ Completed") {
    return <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />;
  }
  return <CircleDotDashed className="h-5 w-5 text-yellow-500 mr-2" />;
};

export function TradeManagementSection({ tradePlan }: TradeManagementSectionProps) {
  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Trade Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="p-4 bg-primary/10 rounded-lg mb-6 shadow">
          <h4 className="font-semibold text-lg text-primary mb-2">Daily Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><strong className="text-foreground/80">Daily Target:</strong> ${tradePlan.dailyTarget.toFixed(2)}</p>
            <p><strong className="text-foreground/80">Total Trades Required:</strong> {tradePlan.totalTradesRequired}</p>
            <p><strong className="text-foreground/80">Completed Trades:</strong> {tradePlan.completedTrades}</p>
            <p><strong className="text-foreground/80">Remaining Trades:</strong> {tradePlan.remainingTrades}</p>
          </div>
        </div>

        <Accordion type="multiple" defaultValue={tradePlan.groups.map(g => `group-${g.groupNumber}`)} className="w-full">
          {tradePlan.groups.map((group) => (
            <AccordionItem value={`group-${group.groupNumber}`} key={group.groupNumber} className="mb-4 bg-card border rounded-lg shadow-sm">
              <AccordionTrigger className="px-4 py-3 hover:bg-secondary/50 rounded-t-lg">
                <div className="flex justify-between w-full items-center">
                  <span className="font-semibold text-md text-primary">
                    1% Target Group {group.groupNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {group.trades.length} trades, {group.totalLots} lots total
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 border-t">
                <div className="space-y-3">
                  {group.trades.map((trade, index) => (
                    <div key={index} className="p-3 bg-background border border-border/50 rounded-md shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-1">
                        <h5 className="font-medium text-foreground">Trade {trade.tradeNumber + 1}</h5>
                         <div className={`flex items-center text-xs px-2 py-1 rounded-full ${trade.status === "✅ Completed" ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100"}`}>
                          <TradeStatusIcon status={trade.status} /> {trade.status.split(" ")[1]}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-x-2 text-sm text-muted-foreground">
                        <span>Lots: <strong className="text-foreground">{trade.lots}</strong></span>
                        <span>Profit: <strong className="text-foreground">${trade.profit}</strong></span>
                        <span>Gain: <strong className="text-foreground">{trade.percent}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
