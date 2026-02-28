import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PermanentlyDeletePatientDialog } from "./PermanentlyDeletePatientDialog";

export function ArchivedPatientsTable() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patientToDelete, setPatientToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients_archived"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_active", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from("patients")
        .update({ is_active: true } as any)
        .eq("id", patientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients_with_visits"] });
      queryClient.invalidateQueries({ queryKey: ["patients_archived"] });
      toast({ title: "Patient restored successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to restore patient", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients_archived"] });
      toast({ title: "Patient permanently deleted" });
    },
    onError: (error) => {
      toast({ title: "Failed to delete patient", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Last Visit</TableHead>
            <TableHead className="w-24">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              </TableRow>
            ))
          ) : patients && patients.length > 0 ? (
            patients.map((patient) => (
              <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/patients/${patient.id}`)}>
                <TableCell>
                  <span className="font-semibold text-foreground">{patient.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {patient.phone || "—"} · {patient.age} yrs
                  </span>
                </TableCell>
                <TableCell>
                  {patient.last_visit_date
                    ? format(new Date(patient.last_visit_date), "MMM d, yyyy")
                    : "—"}
                </TableCell>
                <TableCell className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unarchiveMutation.isPending}
                    onClick={(e) => { e.stopPropagation(); unarchiveMutation.mutate(patient.id); }}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deleteMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPatientToDelete({ id: patient.id, name: patient.name });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                No archived patients.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <PermanentlyDeletePatientDialog
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        patientName={patientToDelete?.name || ""}
        onConfirm={async () => {
          if (patientToDelete) {
            await deleteMutation.mutateAsync(patientToDelete.id);
          }
        }}
      />
    </div>
  );
}
