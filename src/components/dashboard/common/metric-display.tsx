"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Metric } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricDisplayProps extends Metric { }

export function MetricDisplay({ label, value, unit, copyable, id, onAction, actionIcon, isActive }: MetricDisplayProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (copyable && id) {
      const textToCopy = `${value}${unit || ""}`;
      navigator.clipboard.writeText(textToCopy.toString()).then(() => {
        toast({
          title: "Copied to clipboard",
          description: `${label}: ${textToCopy}`,
        });

        // Trigger auto-start for trade timer if this is the lot size
        if (id.includes("-lotSize")) {
          window.dispatchEvent(new CustomEvent('start-trade-timer'));
        }
      }).catch(err => {
        console.error('Error copying text: ', err);
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Could not copy text to clipboard.",
        });
      });
    }
  };

  return (
    <Card className={cn(
      "shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden",
      isActive && "border-primary/50 bg-primary/5 shadow-primary/10"
    )}>
      {isActive && (
        <div className="absolute top-0 right-0 p-1 bg-primary text-[8px] font-bold text-white uppercase tracking-tighter rounded-bl-md">
          Shield Active
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p id={id || label.toLowerCase().replace(/\s/g, "-")} className="text-2xl font-bold text-primary transition-colors">
            {value}{unit}
          </p>
          <div className="flex items-center gap-1">
            {onAction && actionIcon === 'shield' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isActive ? "default" : "outline"}
                      size="icon"
                      onClick={onAction}
                      className={cn(
                        "h-8 w-8",
                        isActive ? "bg-primary text-white" : "border-primary/20 text-primary hover:bg-primary/10"
                      )}
                    >
                      <Shield className={cn("h-4 w-4", isActive && "fill-current")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{isActive ? "Disable Risk Shield" : "Apply Risk Shield (1/2 Lots, 2x SL/TP)"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {copyable && (
              <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={`Copy ${label}`}>
                <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
      {metrics.map((metric) => (
        <MetricDisplay key={metric.label} {...metric} />
      ))}
    </div>
  );
}
