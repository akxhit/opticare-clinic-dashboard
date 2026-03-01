import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Phone, Mail, Calendar, Activity, ShieldAlert, CalendarPlus } from "lucide-react";
import { format } from "date-fns";
import { EyeExamForm } from "@/components/EyeExamForm";
import { Prescription } from "@/components/Prescription";
import { ArchivePatientDialog } from "@/components/ArchivePatientDialog";
import { BookAppointmentDialog } from "@/components/BookAppointmentDialog";

import { Patient, Visit } from "@/types/database";

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Patient;
    },
    enabled: !!id,
  });

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["eye_visits", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eye_visits")
        .select("*")
        .eq("patient_id", id!)
        .order("visit_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Patient not found.</p>
        <Button variant="outline" onClick={() => navigate("/patients")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Patients
        </Button>
      </div>
    );
  }

  const flags = patient.medical_history
    ?.split(/[,;\n]/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  const latestVisit = visits?.[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back to previous page">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <p className="text-sm text-muted-foreground">Patient Profile</p>
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Age / Gender</p>
              <p className="font-medium">{patient.age} yrs · {patient.gender || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Phone className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium">{patient.phone || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Mail className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium truncate">{patient.email || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Last Visit</p>
              <p className="font-medium">
                {patient.last_visit_date
                  ? format(new Date(patient.last_visit_date), "MMM d, yyyy")
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Medical History Flags */}
      {flags && flags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {flags.map((flag: string, i: number) => (
              <Badge key={i} variant="secondary">{flag}</Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Schedule & New Visit */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">New Visit — Eye Examination</h2>
        <BookAppointmentDialog
          patientId={patient.id}
          patientName={patient.name}
          trigger={
            <Button variant="outline">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Schedule Next Visit
            </Button>
          }
        />
      </div>

      <section>
        <EyeExamForm patientId={patient.id} />
      </section>

      {/* Prescription */}
      {latestVisit && (
        <section>
          <Separator className="mb-6" />
          <h2 className="mb-4 text-lg font-semibold print:hidden">Prescription — Latest Visit</h2>
          <Prescription patient={patient} visit={latestVisit} />
        </section>
      )}

      {/* Visit History */}
      {visits && visits.length > 0 && (
        <section className="print:hidden">
          <Separator className="mb-6" />
          <h2 className="mb-4 text-lg font-semibold">Visit History</h2>
          <div className="space-y-4">
            {visits.map((v) => (
              <Card key={v.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {format(new Date(v.visit_date), "MMMM d, yyyy")}
                    <span className="ml-2 text-xs">{format(new Date(v.created_at), "h:mm a")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1 rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-primary">Right Eye (OD)</p>
                      <p className="text-sm">VA: {v.od_visual_acuity || "—"} · Sph: {v.od_sph ?? "—"} · Cyl: {v.od_cyl ?? "—"} · Axis: {v.od_axis ?? "—"}° · IOP: {v.od_iop ?? "—"}</p>
                    </div>
                    <div className="space-y-1 rounded-md bg-muted/50 p-3">
                      <p className="text-xs font-semibold text-primary">Left Eye (OS)</p>
                      <p className="text-sm">VA: {v.os_visual_acuity || "—"} · Sph: {v.os_sph ?? "—"} · Cyl: {v.os_cyl ?? "—"} · Axis: {v.os_axis ?? "—"}° · IOP: {v.os_iop ?? "—"}</p>
                    </div>
                  </div>
                  {(v.diagnosis || v.clinical_notes) && (
                    <div className="mt-3 space-y-1 text-sm">
                      {v.diagnosis && <p><span className="font-medium">Diagnosis:</span> {v.diagnosis}</p>}
                      {v.clinical_notes && <p><span className="font-medium">Notes:</span> {v.clinical_notes}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Danger Zone */}
      <section className="print:hidden">
        <Separator className="mb-6" />
        <Card className="border-destructive/30 bg-destructive/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <ShieldAlert className="h-4 w-4" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Archiving this patient will hide them from the dashboard. Their records will be preserved.
            </p>
            <ArchivePatientDialog patientId={patient.id} patientName={patient.name} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
