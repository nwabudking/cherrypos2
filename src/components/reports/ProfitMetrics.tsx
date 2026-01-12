import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, DollarSign, Percent, Store } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BarProfitData {
  barId: string;
  barName: string;
  costPrice: number;
  sellingPrice: number;
  profit: number;
  profitMargin: number;
}

interface ProfitMetricsProps {
  totalCostPrice: number;
  totalSellingPrice: number;
  profit: number;
  profitMargin: number;
  isLoading: boolean;
  barProfitData?: BarProfitData[];
  selectedBarFilter?: string;
  onBarFilterChange?: (barId: string) => void;
  bars?: Array<{ id: string; name: string }>;
}

export const ProfitMetrics = ({
  totalCostPrice,
  totalSellingPrice,
  profit,
  profitMargin,
  isLoading,
  barProfitData = [],
  selectedBarFilter = "all",
  onBarFilterChange,
  bars = [],
}: ProfitMetricsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Get display values based on filter
  const getDisplayValues = () => {
    if (selectedBarFilter === "all" || !barProfitData.length) {
      return { totalCostPrice, totalSellingPrice, profit, profitMargin };
    }
    
    const barData = barProfitData.find(b => b.barId === selectedBarFilter);
    if (barData) {
      return {
        totalCostPrice: barData.costPrice,
        totalSellingPrice: barData.sellingPrice,
        profit: barData.profit,
        profitMargin: barData.profitMargin,
      };
    }
    
    return { totalCostPrice, totalSellingPrice, profit, profitMargin };
  };

  const displayValues = getDisplayValues();

  const metrics = [
    {
      title: "Total Cost Price",
      value: formatCurrency(displayValues.totalCostPrice),
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      title: "Total Selling Price",
      value: formatCurrency(displayValues.totalSellingPrice),
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Daily Profit",
      value: formatCurrency(displayValues.profit),
      icon: DollarSign,
      color: displayValues.profit >= 0 ? "text-emerald-500" : "text-destructive",
      bg: displayValues.profit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
    },
    {
      title: "Profit Margin",
      value: `${displayValues.profitMargin.toFixed(1)}%`,
      icon: Percent,
      color: displayValues.profitMargin >= 0 ? "text-primary" : "text-destructive",
      bg: displayValues.profitMargin >= 0 ? "bg-primary/10" : "bg-destructive/10",
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Daily Profit Analysis
          </CardTitle>
          
          {bars.length > 0 && onBarFilterChange && (
            <Select value={selectedBarFilter} onValueChange={onBarFilterChange}>
              <SelectTrigger className="w-[180px]">
                <Store className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Bars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bars (General)</SelectItem>
                {bars.map((bar) => (
                  <SelectItem key={bar.id} value={bar.id}>
                    {bar.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Metrics */}
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

        {/* Bar-by-Bar Breakdown (when showing all) */}
        {selectedBarFilter === "all" && barProfitData.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Store className="h-4 w-4" />
              Profit by Bar Location
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {barProfitData.map((bar) => (
                <div
                  key={bar.barId}
                  className="p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{bar.barName}</span>
                    <span className={`text-sm font-medium ${bar.profitMargin >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                      {bar.profitMargin.toFixed(1)}%
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium">{formatCurrency(bar.costPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="font-medium">{formatCurrency(bar.sellingPrice)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Profit</p>
                      <p className={`font-medium ${bar.profit >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                        {formatCurrency(bar.profit)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};