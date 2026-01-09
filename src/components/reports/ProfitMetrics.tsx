import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

interface ProfitMetricsProps {
  totalCostPrice: number;
  totalSellingPrice: number;
  profit: number;
  profitMargin: number;
  isLoading: boolean;
}

export const ProfitMetrics = ({
  totalCostPrice,
  totalSellingPrice,
  profit,
  profitMargin,
  isLoading,
}: ProfitMetricsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const metrics = [
    {
      title: "Total Cost Price",
      value: formatCurrency(totalCostPrice),
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Total Selling Price",
      value: formatCurrency(totalSellingPrice),
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Daily Profit",
      value: formatCurrency(profit),
      icon: DollarSign,
      color: profit >= 0 ? "text-emerald-500" : "text-destructive",
      bg: profit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
    },
    {
      title: "Profit Margin",
      value: `${profitMargin.toFixed(1)}%`,
      icon: Percent,
      color: profitMargin >= 0 ? "text-primary" : "text-destructive",
      bg: profitMargin >= 0 ? "bg-primary/10" : "bg-destructive/10",
    },
  ];

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Daily Profit Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Daily Profit Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.title}
              className="flex items-center gap-4 p-4 rounded-lg bg-muted/50"
            >
              <div className={`p-3 rounded-full ${metric.bg}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
