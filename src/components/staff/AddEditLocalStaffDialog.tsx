import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StaffUser } from "@/hooks/useStaffUsers";
import type { AppRole } from "@/contexts/AuthContext";
import { User, Lock, Mail, BadgeCheck } from "lucide-react";

interface AddEditLocalStaffDialogProps {
  staff: StaffUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    username: string;
    password: string;
    full_name: string;
    email?: string;
    role: AppRole;
  }) => void;
  onUpdate?: (data: {
    full_name: string;
    email?: string;
    role: AppRole;
    is_active: boolean;
  }) => void;
  isSaving: boolean;
  isEditing: boolean;
}

const roles: { value: AppRole; label: string }[] = [
  { value: "cashier", label: "Cashier" },
  { value: "waitstaff", label: "Waitstaff" },
  { value: "bar_staff", label: "Bar Staff" },
  { value: "kitchen_staff", label: "Kitchen Staff" },
  { value: "inventory_officer", label: "Inventory Officer" },
  { value: "accountant", label: "Accountant" },
  { value: "store_admin", label: "Store Admin" },
  { value: "store_user", label: "Store User" },
  { value: "manager", label: "Manager" },
];

export const AddEditLocalStaffDialog = ({
  staff,
  open,
  onOpenChange,
  onSave,
  onUpdate,
  isSaving,
  isEditing,
}: AddEditLocalStaffDialogProps) => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: "cashier" as AppRole,
    is_active: true,
  });

  useEffect(() => {
    if (staff && isEditing) {
      setFormData({
        username: staff.username || "",
        password: "",
        full_name: staff.full_name || "",
        email: staff.email || "",
        role: staff.role || "cashier",
        is_active: staff.is_active,
      });
    } else {
      setFormData({
        username: "",
        password: "",
        full_name: "",
        email: "",
        role: "cashier",
        is_active: true,
      });
    }
  }, [staff, isEditing, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && onUpdate) {
      onUpdate({
        full_name: formData.full_name,
        email: formData.email || undefined,
        role: formData.role,
        is_active: formData.is_active,
      });
    } else {
      onSave({
        username: formData.username.toLowerCase().trim(),
        password: formData.password,
        full_name: formData.full_name,
        email: formData.email || undefined,
        role: formData.role,
      });
    }
  };

  const isValid = isEditing 
    ? formData.full_name.trim() !== ""
    : formData.username.trim() !== "" && formData.password.length >= 6 && formData.full_name.trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Staff Member" : "Add New Staff"}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Update staff member details and role"
              : "Create a new staff account with username and password"
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEditing && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="johndoe"
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for login. Letters, numbers, underscores only.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="pl-10"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name *</Label>
            <div className="relative">
              <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="John Doe"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as AppRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEditing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_active">Active (can log in)</Label>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || !isValid}>
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create Staff"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
