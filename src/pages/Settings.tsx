import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings as SettingsIcon, Building2, Receipt, User, Globe, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RestaurantSettingsForm {
  name?: string;
  tagline?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string;
  timezone?: string;
  receipt_footer?: string | null;
  receipt_show_logo?: boolean;
}

const timezones = [
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)" },
  { value: "Africa/Cairo", label: "Cairo (EET)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
];

const currencies = [
  { value: "NGN", label: "Nigerian Naira (₦)" },
  { value: "USD", label: "US Dollar ($)" },
  { value: "GBP", label: "British Pound (£)" },
  { value: "EUR", label: "Euro (€)" },
  { value: "ZAR", label: "South African Rand (R)" },
  { value: "KES", label: "Kenyan Shilling (KSh)" },
];

const Settings = () => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState("restaurant");
  const [restaurantForm, setRestaurantForm] = useState<RestaurantSettingsForm>({});
  const [profileForm, setProfileForm] = useState<{ full_name?: string | null }>({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canEditSettings = role === "super_admin" || role === "manager";

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  // Initialize form when settings load
  if (settings && !restaurantForm.name) {
    setRestaurantForm(settings);
  }

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error("Failed to change password: " + error.message);
    },
  });

  const handleSaveRestaurant = () => {
    updateSettingsMutation.mutate(restaurantForm);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your restaurant and account settings
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="restaurant" className="gap-2">
            <Building2 className="h-4 w-4 hidden sm:block" />
            Restaurant
          </TabsTrigger>
          <TabsTrigger value="receipt" className="gap-2">
            <Receipt className="h-4 w-4 hidden sm:block" />
            Receipt
          </TabsTrigger>
          <TabsTrigger value="account" className="gap-2">
            <User className="h-4 w-4 hidden sm:block" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>
                This information will appear on receipts and reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Restaurant Name</Label>
                  <Input
                    id="name"
                    value={restaurantForm.name || ""}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                    disabled={!canEditSettings}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input
                    id="tagline"
                    value={restaurantForm.tagline || ""}
                    onChange={(e) => setRestaurantForm({ ...restaurantForm, tagline: e.target.value })}
                    disabled={!canEditSettings}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={restaurantForm.address || ""}
                  onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
                  disabled={!canEditSettings}
                />
              </div>

              {canEditSettings && (
                <Button onClick={handleSaveRestaurant} disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Receipt Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show Logo on Receipt</Label>
                <Switch
                  checked={restaurantForm.receipt_show_logo || false}
                  onCheckedChange={(checked) =>
                    setRestaurantForm({ ...restaurantForm, receipt_show_logo: checked })
                  }
                  disabled={!canEditSettings}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt_footer">Receipt Footer Message</Label>
                <Textarea
                  id="receipt_footer"
                  value={restaurantForm.receipt_footer || ""}
                  onChange={(e) =>
                    setRestaurantForm({ ...restaurantForm, receipt_footer: e.target.value })
                  }
                  rows={3}
                  disabled={!canEditSettings}
                />
              </div>

              {canEditSettings && (
                <Button onClick={handleSaveRestaurant} disabled={updateSettingsMutation.isPending}>
                  {updateSettingsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={() => changePasswordMutation.mutate()}
                disabled={changePasswordMutation.isPending || !newPassword || !confirmPassword}
              >
                {changePasswordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
