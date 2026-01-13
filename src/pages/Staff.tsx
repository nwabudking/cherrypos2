import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import {
  useStaff,
  useUpdateStaff,
  useUpdateStaffRole,
  useDeleteStaff,
  useCreateStaff,
  useResetPassword,
} from "@/hooks/useStaff";
import { useCashierAssignments } from "@/hooks/useCashierAssignment";
import { StaffHeader } from "@/components/staff/StaffHeader";
import { StaffTable } from "@/components/staff/StaffTable";
import { AddEditStaffDialog } from "@/components/staff/AddEditStaffDialog";
import { DeleteStaffDialog } from "@/components/staff/DeleteStaffDialog";
import { CashierAssignmentDialog } from "@/components/staff/CashierAssignmentDialog";
import { ResetPasswordDialog } from "@/components/staff/ResetPasswordDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store } from "lucide-react";

export interface StaffMember {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  role: AppRole | null;
}

const Staff = () => {
  const { toast } = useToast();
  const { role: currentUserRole, user } = useAuth();

  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: staffMembers = [], isLoading } = useStaff();
  const { data: assignments = [] } = useCashierAssignments();
  const createStaffMutation = useCreateStaff();
  const updateStaffMutation = useUpdateStaff();
  const updateRoleMutation = useUpdateStaffRole();
  const deleteStaffMutation = useDeleteStaff();

  // Transform staff data to match expected format
  const transformedStaff: StaffMember[] = staffMembers.map((s) => ({
    id: s.id,
    email: s.email,
    full_name: s.full_name,
    avatar_url: s.avatar_url,
    created_at: s.created_at,
    role: s.role as AppRole | null,
  }));

  // Add bar assignment info
  const staffWithAssignments = transformedStaff.map((staff) => {
    const assignment = assignments.find((a) => a.user_id === staff.id);
    return {
      ...staff,
      assignedBar: assignment?.bar?.name || null,
    };
  });

  const filteredStaff = staffWithAssignments.filter((staff) => {
    const matchesSearch =
      !searchQuery ||
      staff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || staff.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const canManageStaff = currentUserRole === "super_admin" || currentUserRole === "manager";

  const handleAddStaff = () => {
    setSelectedStaff(null);
    setIsEditing(false);
    setIsAddEditDialogOpen(true);
  };

  const handleEditStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsEditing(true);
    setIsAddEditDialogOpen(true);
  };

  const handleDeleteStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsDeleteDialogOpen(true);
  };

  const handleAssignBar = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsAssignmentDialogOpen(true);
  };

  const handleResetPassword = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setIsResetPasswordDialogOpen(true);
  };

  const handleSaveStaff = (data: {
    email?: string;
    password?: string;
    fullName: string;
    role: AppRole;
  }) => {
    if (isEditing && selectedStaff) {
      // Update profile info
      updateStaffMutation.mutate(
        {
          id: selectedStaff.id,
          data: { full_name: data.fullName },
        },
        {
          onSuccess: () => {
            // Then update role
            updateRoleMutation.mutate({ id: selectedStaff.id, role: data.role });
            setIsAddEditDialogOpen(false);
            setSelectedStaff(null);
          },
        }
      );
    } else if (data.email && data.password) {
      createStaffMutation.mutate(
        {
          email: data.email,
          password: data.password,
          full_name: data.fullName,
          role: data.role,
        },
        {
          onSuccess: () => {
            setIsAddEditDialogOpen(false);
            setSelectedStaff(null);
          },
        }
      );
    }
  };

  const handleConfirmDelete = () => {
    if (selectedStaff) {
      deleteStaffMutation.mutate(selectedStaff.id, {
        onSuccess: () => {
          setIsDeleteDialogOpen(false);
          setSelectedStaff(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <StaffHeader
        staffCount={transformedStaff.length}
        onAddStaff={handleAddStaff}
        canManage={canManageStaff}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
      />

      <StaffTable
        staff={filteredStaff}
        isLoading={isLoading}
        onEdit={handleEditStaff}
        onDelete={handleDeleteStaff}
        canManage={canManageStaff}
        currentUserId={user?.id}
        onAssignBar={handleAssignBar}
        onResetPassword={handleResetPassword}
      />

      <AddEditStaffDialog
        staff={selectedStaff}
        open={isAddEditDialogOpen}
        onOpenChange={setIsAddEditDialogOpen}
        onSave={handleSaveStaff}
        isSaving={createStaffMutation.isPending || updateStaffMutation.isPending}
        isEditing={isEditing}
      />

      <DeleteStaffDialog
        staff={selectedStaff}
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteStaffMutation.isPending}
      />

      <CashierAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        staffMember={selectedStaff}
      />

      <ResetPasswordDialog
        staff={selectedStaff}
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
      />
    </div>
  );
};

export default Staff;
