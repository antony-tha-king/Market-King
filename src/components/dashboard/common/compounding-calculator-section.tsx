"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { CompoundingFrequency, CompoundingResult } from "@/lib/types";
import { calculateCompoundingLogic } from "@/lib/utils";

export function CompoundingCalculatorSection() {
  const [initialBalance, setInitialBalance] = useState<string>("");
  const [frequency, setFrequency] = useState<CompoundingFrequency>("daily");
  const [period, setPeriod] = useState<string>("");
  const [results, setResults] = useState<CompoundingResult | null>(null);
  const { toast } = useToast();

  const handleCalculate = () => {
    const balance = parseFloat(initialBalance);
    const numPeriods = parseFloat(period);

    if (isNaN(balance) || balance <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid initial balance." });
      return;
    }
    if (isNaN(numPeriods) || numPeriods <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid number of periods." });
      return;
    }

    const calculated = calculateCompoundingLogic(balance, frequency, numPeriods);
    setResults(calculated);
  };
  
  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Compounding Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <Label htmlFor="initialBalanceComp" className="text-foreground/80">Initial Balance</Label>
            <Input id="initialBalanceComp" type="number" placeholder="Enter initial balance" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="compoundFrequencyComp" className="text-foreground/80">Compounding Frequency</Label>
            <Select value={frequency} onValueChange={(value: CompoundingFrequency) => setFrequency(value)}>
              <SelectTrigger id="compoundFrequencyComp">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="periodComp" className="text-foreground/80">Number of Periods</Label>
            <Input id="periodComp" type="number" placeholder="Enter periods" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleCalculate} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mb-6 py-3 text-base">
          Calculate Growth
        </Button>

        {results && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/50 rounded-lg shadow text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Projected Balance</h4>
              <p className="text-xl font-bold text-primary">{results.projectedBalance}</p>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg shadow text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Growth</h4>
              <p className="text-xl font-bold text-primary">{results.totalGrowth}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
