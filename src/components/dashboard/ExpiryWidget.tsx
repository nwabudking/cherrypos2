import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays, addDays, isBefore } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ExpiringItem {
  id: string;
  name: string;
  expiry_date: string;
  current_stock: number;
  unit: string;
  category: string | null;
  daysUntilExpiry: number;
}

export const ExpiryWidget = () => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: expiringItems = [], isLoading } = useQuery({
    queryKey: ["dashboard-expiring-items"],
    queryFn: async () => {
      const sevenDaysFromNow = addDays(new Date(), 7);
      
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, expiry_date, current_stock, unit, category')
        .eq('is_active', true)
        .not('expiry_date', 'is', null)
        .lte('expiry_date', sevenDaysFromNow.toISOString())
        .gt('current_stock', 0)
        .order('expiry_date', { ascending: true });
      
      if (error) throw error;
      
      const today = new Date();
      return (data || []).map(item => ({
        ...item,
        daysUntilExpiry: differenceInDays(new Date(item.expiry_date!), today),
      })) as ExpiringItem[];
    },
  });

  const expiredItems = expiringItems.filter(item => item.daysUntilExpiry < 0);
  const expiringInWeek = expiringItems.filter(item => item.daysUntilExpiry >= 0);

  const getExpiryBadge = (days: number) => {
    if (days < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (days === 0) {
      return <Badge variant="destructive">Expires Today</Badge>;
    } else if (days <= 3) {
      return <Badge className="bg-amber-500">In {days} days</Badge>;
    } else {
      return <Badge variant="outline" className="text-amber-600 border-amber-300">In {days} days</Badge>;
    }
  };

  const totalCount = expiringItems.length;
  const criticalCount = expiringItems.filter(i => i.daysUntilExpiry <= 3).length;

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Expiring Soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className={`bg-card border-border ${criticalCount > 0 ? 'border-amber-500' : ''} cursor-pointer hover:border-primary/30 transition-colors`}
        onClick={() => totalCount > 0 && setDetailsOpen(true)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Expiring Soon (7 Days)
            </span>
            {criticalCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {criticalCount} Critical
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalCount === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No items expiring in the next 7 days</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expiringItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      item.daysUntilExpiry < 0 ? 'bg-destructive/20' : 
                      item.daysUntilExpiry <= 3 ? 'bg-amber-500/20' : 'bg-muted'
                    }`}>
                      <AlertTriangle className={`w-5 h-5 ${
                        item.daysUntilExpiry < 0 ? 'text-destructive' : 
                        item.daysUntilExpiry <= 3 ? 'text-amber-500' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.current_stock} {item.unit} • {item.category || 'Uncategorized'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getExpiryBadge(item.daysUntilExpiry)}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(item.expiry_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              ))}
              
              {totalCount > 4 && (
                <Button variant="ghost" className="w-full text-primary">
                  View all {totalCount} items
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Expiring Products
            </DialogTitle>
            <DialogDescription>
              Products expiring within the next 7 days
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[400px]">
            {expiredItems.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Expired ({expiredItems.length})
                </h4>
                <div className="space-y-2">
                  {expiredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.current_stock} {item.unit}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">Expired</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.expiry_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {expiringInWeek.length > 0 && (
              <div>
                <h4 className="font-semibold text-amber-600 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Expiring Soon ({expiringInWeek.length})
                </h4>
                <div className="space-y-2">
                  {expiringInWeek.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.current_stock} {item.unit}</p>
                      </div>
                      <div className="text-right">
                        {getExpiryBadge(item.daysUntilExpiry)}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.expiry_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
