"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Metric } from "@/lib/types";

interface MetricDisplayProps extends Metric {}

export function MetricDisplay({ label, value, unit, copyable, id }: MetricDisplayProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (copyable && id) {
      const textToCopy = `${value}${unit || ""}`;
      navigator.clipboard.writeText(textToCopy.toString()).then(() => {
        toast({
          title: "Copied to clipboard",
          description: `${label}: ${textToCopy}`,
        });
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
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p id={id || label.toLowerCase().replace(/\s/g, "-")} className="text-2xl font-bold text-primary">
            {value}{unit}
          </p>
          {copyable && (
            <Button variant="ghost" size="icon" onClick={handleCopy} aria-label={`Copy ${label}`}>
              <Copy className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </Button>
          )}
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
