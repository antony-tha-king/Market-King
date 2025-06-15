
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { TradeDirection, TradeCalculationResult, InstrumentType } from "@/lib/types";
import { calculateTradePointsLogic } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Copy } from "lucide-react";

interface TradeCalculatorSectionProps {
  currentBalance: number;
  instrumentType: InstrumentType;
  instrumentName: string;
}

interface ResultItemProps {
  label: string;
  value: string;
  idSuffix: string;
}

const ResultItem = ({ label, value, idSuffix }: ResultItemProps) => {
  const { toast } = useToast();
  const elementId = `${label.toLowerCase().replace(/\s/g, "-").replace(/[()]/g, "")}-${idSuffix}`;

  const handleCopy = () => {
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
    <div className="p-4 bg-secondary/50 rounded-lg shadow text-center">
      <h4 className="text-sm font-medium text-muted-foreground mb-1">{label}</h4>
      <div className="flex items-center justify-center space-x-2">
        <p id={elementId} className="text-lg font-bold text-primary">{value}</p>
        {value !== "-" && (
          <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={`Copy ${label}`}>
            <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Button>
        )}
      </div>
    </div>
  );
};


export function TradeCalculatorSection({ currentBalance, instrumentType, instrumentName }: TradeCalculatorSectionProps) {
  const [entryPrice, setEntryPrice] = useState<string>("");
  const [tradeDirection, setTradeDirection] = useState<TradeDirection>("rise");
  const [customTP, setCustomTP] = useState<string>(instrumentType === 'volatility75' ? "2000" : "500");
  const [customSL, setCustomSL] = useState<string>(instrumentType === 'volatility75' ? "1000" : "500");
  const [results, setResults] = useState<TradeCalculationResult | null>(null);
  const { toast } = useToast();

  const handleCalculate = () => {
    const entry = parseFloat(entryPrice);
    const tpPips = parseInt(customTP);
    const slPips = parseInt(customSL);

    if (isNaN(entry)) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid entry price." });
      return;
    }
    if (isNaN(tpPips) || tpPips <=0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter valid pips for Custom TP (must be > 0)." });
      return;
    }
     if (isNaN(slPips) || slPips <=0) {
      toast({ variant: "destructive", title: "Invalid Input", description: "Please enter valid pips for Custom SL (must be > 0)." });
      return;
    }

    const calculated = calculateTradePointsLogic({
      entryPrice: entry,
      direction: tradeDirection,
      customTP: tpPips,
      customSL: slPips,
      currentBalance,
      instrumentType,
    });
    setResults(calculated);
  };

  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">{instrumentName} Trade Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <Label htmlFor="entryPriceCalc" className="text-foreground/80">Entry Price</Label>
            <Input id="entryPriceCalc" type="number" placeholder="Enter entry price" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="tradeDirectionCalc" className="text-foreground/80">Trade Direction</Label>
            <Select value={tradeDirection} onValueChange={(value: TradeDirection) => setTradeDirection(value)}>
              <SelectTrigger id="tradeDirectionCalc">
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rise">
                  <div className="flex items-center"><ArrowUpRight className="h-4 w-4 mr-2 text-green-500" /> Rise (Buy)</div>
                </SelectItem>
                <SelectItem value="fall">
                  <div className="flex items-center"><ArrowDownLeft className="h-4 w-4 mr-2 text-red-500" /> Fall (Sell)</div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="customTPCalc" className="text-foreground/80">Custom Take Profit (pips)</Label>
            <Input id="customTPCalc" type="number" placeholder={instrumentType === 'volatility75' ? "e.g., 2000" : "e.g., 500"} value={customTP} onChange={(e) => setCustomTP(e.target.value)} />
          </div>
           <div>
            <Label htmlFor="customSLCalc" className="text-foreground/80">Custom Stop Loss (pips)</Label>
            <Input id="customSLCalc" type="number" placeholder={instrumentType === 'volatility75' ? "e.g., 1000" : "e.g., 500"} value={customSL} onChange={(e) => setCustomSL(e.target.value)} />
          </div>
        </div>
        <Button onClick={handleCalculate} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mb-6 py-3 text-base">
          Calculate Trade Parameters
        </Button>

        {results && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ResultItem label="Custom Take Profit (TP)" value={results.tpCustom} idSuffix={instrumentType} />
            <ResultItem label="Stop Loss (SL)" value={results.slPrice} idSuffix={instrumentType} />
            <ResultItem label="Recommended Lot Size" value={results.calculatedLots} idSuffix={instrumentType} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
