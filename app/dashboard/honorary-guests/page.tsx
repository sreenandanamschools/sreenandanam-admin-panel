"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2, Loader2, Star, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageUpload } from "@/components/ui/image-upload";
import { toast } from "sonner";
import type { HonoraryGuests } from "@/lib/supabase/types";

export default function FamousGuestsPage() {
  const supabase = createClient();

  const [guests, setGuests] = useState<HonoraryGuests[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<HonoraryGuests | null>(null);

  const [form, setForm] = useState({
    name: "",
    designation: "",
    description: "",
    visited_at: new Date().toISOString().split("T")[0],
    image_url: null as string | null,
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const fetchGuests = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("honorary-guests")
        .select("*")
        .order("visited_at", { ascending: false });

      if (error) throw error;
      setGuests(data || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const openAddDialog = () => {
    setEditingGuest(null);
    setForm({
      name: "",
      designation: "",
      description: "",
      visited_at: new Date().toISOString().split("T")[0],
      image_url: null,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (Guest: HonoraryGuests) => {
    setEditingGuest(Guest);
    setForm({
      name: Guest.name,
      designation: Guest.designation,
      description: Guest.description || "",
      visited_at: Guest.visited_at,
      image_url: Guest.image_url,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.designation || !form.visited_at) {
      return toast.error("Name, Designation, and Visit Date are required");
    }

    setIsSaving(true);
    try {
      if (editingGuest) {
        const { error } = await supabase
          .from("honorary-guests")
          .update({
            ...form,
            description: form.description || null,
          })
          .eq("id", editingGuest.id);
        if (error) throw error;
        toast.success("Guest updated successfully");
      } else {
        const { error } = await supabase.from("honorary-guests").insert({
          ...form,
          description: form.description || null,
        });
        if (error) throw error;
        toast.success("Guest added successfully");
      }
      setDialogOpen(false);
      fetchGuests();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("honorary-guests")
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Guest deleted");
      setDeleteDialogOpen(false);
      fetchGuests();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Honorary Guests</h1>
          <p className="text-slate-600 mt-1">
            Manage prominent guests who visited the school
          </p>
        </div>
        <Button
          onClick={openAddDialog}
          className="gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Add Guest
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            <p className="text-sm text-slate-400">Loading honorary guests...</p>
          </div>
        </div>
      ) : guests.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-20 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
            <Star className="h-6 w-6 text-slate-300" />
          </div>
          <h3 className="text-sm font-medium text-slate-700 mb-1">No honorary guests yet</h3>
          <p className="text-sm text-slate-500">Add your first honored guest to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {guests.map((Guest) => (
            <div
              key={Guest.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
            >
              <div className="aspect-video relative bg-slate-50 flex items-center justify-center overflow-hidden">
                {Guest.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={Guest.image_url}
                    alt={Guest.name}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <Star className="h-12 w-12 text-slate-300" />
                )}
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon-sm"
                    variant="secondary"
                    className="h-8 w-8 bg-white/90 hover:bg-white shadow-sm"
                    onClick={() => openEditDialog(Guest)}
                  >
                    <Edit2 className="h-4 w-4 text-slate-700" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => {
                      setDeleteId(Guest.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {Guest.name}
                  </h3>
                  <p className="text-xs font-medium text-blue-600 line-clamp-1 mt-0.5">
                    {Guest.designation}
                  </p>
                </div>

                {Guest.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    &ldquo;{Guest.description}&rdquo;
                  </p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-3 border-t border-slate-100">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Visited{" "}
                    {new Date(Guest.visited_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? "Edit Guest" : "Add Honorary Guest"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center mb-6">
              <ImageUpload
                folder="Guests"
                shape="avatar"
                value={form.image_url}
                onChange={(url) => setForm({ ...form, image_url: url })}
                onRemove={() => setForm({ ...form, image_url: null })}
              />
            </div>

            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Dr. A.P.J. Abdul Kalam"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Designation *</Label>
                <Input
                  value={form.designation}
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                  placeholder="e.g. Former President"
                />
              </div>
              <div className="space-y-2">
                <Label>Visit Date *</Label>
                <Input
                  type="date"
                  value={form.visited_at}
                  onChange={(e) =>
                    setForm({ ...form, visited_at: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description / Remarks</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="A brief note about their visit..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingGuest ? "Save Changes" : "Add Guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600">
            Are you sure you want to remove this Guest record? This action
            cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Record"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
