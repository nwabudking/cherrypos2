import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

interface ExpiryItem {
  id: string;
  name: string;
  expiry_date: string;
  current_stock: number;
  unit: string;
}

interface ExpiryAlertProps {
  items: ExpiryItem[];
  warningDays?: number;
}

export const ExpiryAlert = ({ items, warningDays = 30 }: ExpiryAlertProps) => {
  const today = new Date();
  
  const expiringItems = items.filter(item => {
    if (!item.expiry_date) return false;
    const expiryDate = parseISO(item.expiry_date);
    const daysUntilExpiry = differenceInDays(expiryDate, today);
    return daysUntilExpiry <= warningDays && daysUntilExpiry >= 0;
  });

  const expiredItems = items.filter(item => {
    if (!item.expiry_date) return false;
    const expiryDate = parseISO(item.expiry_date);
    return differenceInDays(expiryDate, today) < 0;
  });

  if (expiringItems.length === 0 && expiredItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {expiredItems.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center gap-2">
            Expired Products
            <Badge variant="destructive">{expiredItems.length}</Badge>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {expiredItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    Expired {format(parseISO(item.expiry_date), 'MMM d, yyyy')} • {item.current_stock} {item.unit}
                  </span>
                </div>
              ))}
              {expiredItems.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  And {expiredItems.length - 5} more...
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {expiringItems.length > 0 && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <Clock className="h-4 w-4 text-amber-500" />
          <AlertTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
            Expiring Soon
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              {expiringItems.length}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {expiringItems.slice(0, 5).map((item) => {
                const daysLeft = differenceInDays(parseISO(item.expiry_date), today);
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{item.name}</span>
                    <span className="text-muted-foreground">
                      {daysLeft === 0 ? 'Expires today' : `${daysLeft} days left`} • {item.current_stock} {item.unit}
                    </span>
                  </div>
                );
              })}
              {expiringItems.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  And {expiringItems.length - 5} more...
                </p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
