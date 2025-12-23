import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Check, X } from "lucide-react";

interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export const CategoriesTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["menu-categories-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = Math.max(...categories.map((c) => c.sort_order), 0);
      const { error } = await supabase
        .from("menu_categories")
        .insert({ name, sort_order: maxOrder + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category created" });
      queryClient.invalidateQueries({ queryKey: ["menu-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      setNewName("");
      setIsAdding(false);
    },
    onError: () => {
      toast({ title: "Error creating category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("menu_categories")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category updated" });
      queryClient.invalidateQueries({ queryKey: ["menu-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Error updating category", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("menu_categories")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("menu_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Category deleted" });
      queryClient.invalidateQueries({ queryKey: ["menu-categories-all"] });
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
    },
    onError: () => {
      toast({ title: "Error deleting category", variant: "destructive" });
    },
  });

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateMutation.mutate({ id: editingId, name: editName.trim() });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Organize your menu items into categories
        </p>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        )}
      </div>

      {/* Add new category */}
      {isAdding && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    createMutation.mutate(newName.trim());
                  }
                  if (e.key === "Escape") {
                    setIsAdding(false);
                    setNewName("");
                  }
                }}
              />
              <Button
                size="icon"
                onClick={() => newName.trim() && createMutation.mutate(newName.trim())}
                disabled={!newName.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {categories.map((category) => (
            <Card key={category.id} className={!category.is_active ? "opacity-50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />

                  {editingId === category.id ? (
                    <>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <Button size="icon" onClick={saveEdit} disabled={!editName.trim()}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={cancelEdit}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 font-medium">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Active</span>
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: category.id, is_active: checked })
                          }
                        />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No categories yet. Add your first category above.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
