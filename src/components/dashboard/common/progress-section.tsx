"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ProgressSectionProps {
  currentBalance: number;
  onUpdateBalance: (newBalance: number) => void;
  targetBalance?: number;
  progressLabel?: string;
}

export function ProgressSection({
  currentBalance,
  onUpdateBalance,
  targetBalance = 1000000,
  progressLabel = "Progress to $1,000,000",
}: ProgressSectionProps) {
  const [dailyInput, setDailyInput] = useState("");
  const { toast } = useToast();

  const handleUpdateBalance = () => {
    const newBalance = parseFloat(dailyInput);
    if (!isNaN(newBalance) && newBalance >= 0) {
      onUpdateBalance(newBalance);
      setDailyInput("");
      toast({
        title: "Balance Updated",
        description: `Current balance set to $${newBalance.toFixed(2)}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a valid balance amount.",
      });
    }
  };

  const progressValue = Math.min((currentBalance / targetBalance) * 100, 100);

  return (
    <Card className="shadow-lg mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-primary">{progressLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progressValue} className="w-full h-4 mb-4" />
        <p className="text-sm text-muted-foreground text-center mb-4">
          Current Balance: ${currentBalance.toFixed(2)} / ${targetBalance.toLocaleString()} ({progressValue.toFixed(2)}%)
        </p>
        <div className="space-y-2">
          <Label htmlFor="dailyInput" className="text-foreground/80">Enter current account balance</Label>
          <div className="flex space-x-2">
            <Input
              id="dailyInput"
              type="number"
              placeholder="e.g., 500.75"
              value={dailyInput}
              onChange={(e) => setDailyInput(e.target.value)}
              className="flex-grow"
            />
            <Button onClick={handleUpdateBalance} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Update Progress
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
