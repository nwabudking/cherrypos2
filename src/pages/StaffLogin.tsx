import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { StaffLoginForm } from "@/components/auth/StaffLoginForm";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

const StaffLogin = () => {
  const { isStaffAuthenticated, isLoading } = useStaffAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isStaffAuthenticated) {
      navigate("/pos");
    }
  }, [isStaffAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <StaffLoginForm />
      
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">Administrator?</p>
        <Link to="/auth">
          <Button variant="outline" size="sm">
            <Shield className="mr-2 h-4 w-4" />
            Admin Login
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default StaffLogin;
