"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { WithdrawalResult } from "@/lib/types";
import { calculateWithdrawalLogic, getLocalStorageItem, setLocalStorageItem } from "@/lib/utils";
import { Copy } from "lucide-react";

export function WithdrawalCalculatorSection() {
  const [manualBalance, setManualBalance] = useState<string>("");
  const [results, setResults] = useState<WithdrawalResult | null>(null);
  const [lastWithdrawalDate, setLastWithdrawalDate] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLastWithdrawalDate(getLocalStorageItem<string | null>('lastWithdrawalDate', null));
  }, []);

  const handleCalculate = () => {
    const balance = parseFloat(manualBalance);
    if (isNaN(balance) || balance <= 0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid balance." });
      return;
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    if (lastWithdrawalDate) {
      const lastDate = new Date(lastWithdrawalDate);
      if (lastDate.getMonth() !== currentMonth || lastDate.getFullYear() !== currentYear) {
         toast({
          title: "Withdrawal Reminder",
          description: "It's a new month! You can consider withdrawing profits.",
        });
      }
    }
    
    // For this demo, we'll allow calculation anytime, reminder is separate.
    // In a real app, actual withdrawal might be locked monthly.
    // The alert "You can withdraw your profits for this month!" implies an action.
    // We'll update the lastWithdrawalDate if it's a new month to simulate a "withdrawal check".
    
    const storedLastDate = lastWithdrawalDate ? new Date(lastWithdrawalDate) : null;
    if (!storedLastDate || (storedLastDate.getMonth() !== currentMonth || storedLastDate.getFullYear() !== currentYear)) {
        const newWithdrawalDate = today.toISOString();
        setLastWithdrawalDate(newWithdrawalDate);
        setLocalStorageItem('lastWithdrawalDate', newWithdrawalDate);
    }


    const calculated = calculateWithdrawalLogic(balance);
    setResults(calculated);
  };

  const handleCopy = (value: string, label: string) => {
    navigator.clipboard.writeText(value).then(() => {
      toast({
        title: "Copied to clipboard",
        description: `${label}: ${value}`,
      });
    }).catch(err => {
      console.error('Error copying text: ', err);
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy text to clipboard.",
      });
    });
  };

  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">Withdrawal Calculation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-6">
          <Label htmlFor="manualBalanceWithdraw" className="text-foreground/80">Enter current balance</Label>
          <div className="flex space-x-2">
            <Input
              id="manualBalanceWithdraw"
              type="number"
              placeholder="e.g., 1200.50"
              value={manualBalance}
              onChange={(e) => setManualBalance(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleCalculate} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Calculate Withdrawal
            </Button>
          </div>
        </div>

        {results && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-secondary/50 rounded-lg shadow text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Estimated Total Growth (30-day period)</h4>
              <div className="flex items-center justify-center space-x-2">
                <p className="text-xl font-bold text-primary">{results.totalGrowth}</p>
                 {results.totalGrowth !== "-" && (
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(results.totalGrowth, "Total Growth")} aria-label="Copy total growth">
                        <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                 )}
              </div>
            </div>
            <div className="p-4 bg-secondary/50 rounded-lg shadow text-center">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Withdrawable Amount (5% of Growth)</h4>
               <div className="flex items-center justify-center space-x-2">
                <p id="withdrawableAmountResult" className="text-xl font-bold text-primary">{results.withdrawableAmount}</p>
                {results.withdrawableAmount !== "-" && (
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(results.withdrawableAmount, "Withdrawable Amount")} aria-label="Copy withdrawable amount">
                        <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
