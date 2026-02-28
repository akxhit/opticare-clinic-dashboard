import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface ArchivePatientDialogProps {
  patientId: string;
  patientName: string;
}

export function ArchivePatientDialog({ patientId, patientName }: ArchivePatientDialogProps) {
  const [confirmName, setConfirmName] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const nameMatches = confirmName.trim() === patientName;

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("patients")
        .update({ is_active: false } as any)
        .eq("id", patientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients_with_visits"] });
      toast({ title: "Patient archived successfully" });
      setOpen(false);
      navigate("/patients");
    },
    onError: (error) => {
      toast({ title: "Failed to archive patient", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setConfirmName(""); }}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full sm:w-auto">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Archive Patient
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Archive Patient
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span className="block font-semibold text-foreground">
              WARNING: To archive this patient, type their exact name below.
            </span>
            <span className="block text-sm">
              This will hide <strong>{patientName}</strong> from the dashboard. Their records will be preserved but no longer visible.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="confirm-name">Type patient name to confirm</Label>
          <Input
            id="confirm-name"
            placeholder={patientName}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!nameMatches || mutation.isPending}
            onClick={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {mutation.isPending ? "Archiving…" : "Archive Patient"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
