import { useCashierAssignment } from "@/hooks/useCashierAssignment";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Store } from "lucide-react";

export function CashierBarDisplay() {
  const { user, role } = useAuth();
  const { data: assignment, isLoading } = useCashierAssignment(user?.id || "");

  // Only show for cashiers
  if (role !== "cashier") {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Store className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!assignment?.bar) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <Store className="h-4 w-4" />
        <span>Not assigned to a bar</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-primary" />
      <Badge variant="secondary" className="font-medium">
        {assignment.bar.name}
      </Badge>
    </div>
  );
}
