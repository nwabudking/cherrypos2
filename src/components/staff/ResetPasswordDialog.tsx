import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useResetPassword } from "@/hooks/useStaff";
import type { StaffMember } from "@/pages/Staff";

interface ResetPasswordDialogProps {
  staff: StaffMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ResetPasswordDialog = ({
  staff,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) => {
  const resetPasswordMutation = useResetPassword();

  if (!staff) return null;

  const handleReset = () => {
    if (staff.email) {
      resetPasswordMutation.mutate(
        { email: staff.email },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Password</AlertDialogTitle>
          <AlertDialogDescription>
            Send a password reset email to <strong>{staff.email}</strong>?
            They will receive an email with instructions to reset their password.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={resetPasswordMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={resetPasswordMutation.isPending || !staff.email}
          >
            {resetPasswordMutation.isPending ? "Sending..." : "Send Reset Email"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
