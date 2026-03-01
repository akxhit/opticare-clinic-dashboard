import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Search, MoreHorizontal, Trash2, Download, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { AddPatientDialog } from "./AddPatientDialog";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import { Patient, PatientWithVisits } from "@/types/database";

export function PatientsTable() {
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Reset to first page on search
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ["patients_with_visits", currentPage, debouncedSearch],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("patients")
        .select("*, eye_visits(diagnosis)", { count: "exact" })
        .eq("is_active", true);

      if (debouncedSearch) {
        // Simple search across name and phone. 
        // Note: Complex joins for eye_visits diagnosis search are harder in Supabase JS client
        // for exact server-side filtering without RPC. We'll stick to name/phone for now
        // to maintain performance, or use a broad filter.
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%`);
      }

      const { data: patients, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return {
        patients: patients as PatientWithVisits[],
        count: count || 0
      };
    },
    placeholderData: keepPreviousData,
  });

  const patients = data?.patients;
  const totalCount = data?.count || 0;

  const archiveMutation = useMutation({
    mutationFn: async (patientId: string) => {
      const { error } = await supabase
        .from("patients")
        .update({ is_active: false })
        .eq("id", patientId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients_with_visits"] });
      toast({ title: "Patient archived successfully" });
      setArchiveTarget(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to archive patient", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({ title: "No patients found to export" });
        return;
      }

      const headers = ["Name", "Age", "Gender", "Phone", "Email", "Medical History", "Registration Date"];

      const escapeCsvField = (field: string | number | boolean | null | undefined) => {
        if (field === null || field === undefined || field === "") return '""';
        const str = String(field);
        const escapedStr = str.replace(/"/g, '""');
        return `"${escapedStr}"`;
      };

      const rows = data.map((p: Patient) => [
        escapeCsvField(p.name),
        escapeCsvField(p.age),
        escapeCsvField(p.gender),
        escapeCsvField(p.phone),
        escapeCsvField(p.email),
        escapeCsvField(p.medical_history),
        escapeCsvField(p.created_at ? format(new Date(p.created_at), "yyyy-MM-dd") : "")
      ]);

      const csvContent = [headers.join(",")].concat(rows.map(row => row.join(","))).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const today = format(new Date(), "yyyy-MM-dd");

      link.setAttribute("href", url);
      link.setAttribute("download", `Clinic_Patients_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ title: "Export successful" });
    } catch (error: any) {
      toast({ title: "Export failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // For the quick search dropdown, we still use a local filter on the current page's results
  // but for the main table, we rely on server-side pagination.
  const dropdownResults = search.length > 0 ? patients?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search by name, phone, or diagnosis"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => search.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            className="pl-9"
            aria-label="Search patients by name, phone number, or diagnosis"
          />
          {showDropdown && dropdownResults && dropdownResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
              {dropdownResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                  onMouseDown={() => {
                    navigate(`/patients/${p.id}`);
                    setShowDropdown(false);
                  }}
                >
                  <span className="font-semibold text-foreground">{p.name}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{p.phone || "No phone"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{p.age} yrs</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export Data
          </Button>
          <AddPatientDialog />
        </div>
      </div>

      <div className="hidden md:block rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || (isPlaceholderData && !patients) ? (
              Array.from({ length: itemsPerPage }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell />
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setArchiveTarget({ id: patient.id, name: patient.name })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                  {search ? "No patients found matching your search." : "No patients found. Add a new patient to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {isLoading || (isPlaceholderData && !patients) ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border bg-card shadow-sm space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))
        ) : patients && patients.length > 0 ? (
          patients.map((patient) => (
            <div
              key={patient.id}
              className="relative p-4 rounded-xl border bg-card shadow-sm active:bg-muted transition-colors"
              onClick={() => navigate(`/patients/${patient.id}`)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-primary">{patient.name}</h3>
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    {patient.phone || "No phone"}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setArchiveTarget({ id: patient.id, name: patient.name })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="pt-3 border-t flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground">Last Visit:</span>
                <span className="text-foreground">
                  {patient.last_visit_date
                    ? format(new Date(patient.last_visit_date), "MMM d, yyyy")
                    : "Never"}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-0.5 bg-muted rounded-full">{patient.age} yrs</span>
                {patient.gender && <span className="px-2 py-0.5 bg-muted rounded-full capitalize">{patient.gender}</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center text-muted-foreground border rounded-xl bg-muted/20">
            {search ? "No patients match your search." : "No patients found."}
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-4 border-t px-2">
        <div className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}</span> to{" "}
          <span className="font-medium text-foreground">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{" "}
          <span className="font-medium text-foreground">{totalCount}</span> patients
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoading}
            className="h-9 px-4"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center justify-center min-w-[32px] text-sm font-medium">
            {currentPage}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage * itemsPerPage >= totalCount || isLoading}
            className="h-9 px-4"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <AlertDialog open={!!archiveTarget} onOpenChange={(v) => { if (!v) setArchiveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive <strong>{archiveTarget?.name}</strong>? They will be hidden from the dashboard but their records will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={archiveMutation.isPending}
              onClick={(e) => { e.preventDefault(); if (archiveTarget) archiveMutation.mutate(archiveTarget.id); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {archiveMutation.isPending ? "Archiving…" : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
