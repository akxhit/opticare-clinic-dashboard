import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Plus } from "lucide-react";
import { Patient, InsertAppointment } from "@/types/database";

interface BookAppointmentDialogProps {
  /** Pre-selected patient id (from Patient Details page) */
  patientId?: string;
  /** Pre-selected patient name for display */
  patientName?: string;
  /** Custom trigger element */
  trigger?: React.ReactNode;
}

export function BookAppointmentDialog({
  patientId,
  patientName,
  trigger,
}: BookAppointmentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [selectedPatientId, setSelectedPatientId] = useState(patientId ?? "");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");

  const { data: patients } = useQuery({
    queryKey: ["patients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Pick<Patient, "id" | "name">[];
    },
    enabled: open && !patientId,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const appointment: InsertAppointment = {
        doctor_id: user!.id,
        patient_id: selectedPatientId,
        appointment_date: format(date!, "yyyy-MM-dd"),
        appointment_time: time,
        reason: reason || null,
      };

      const { error } = await supabase.from("appointments").insert(appointment);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Appointment booked successfully" });
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({ title: "Error booking appointment", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    if (!patientId) setSelectedPatientId("");
    setDate(undefined);
    setTime("09:00");
    setReason("");
  };

  const canSubmit = !!selectedPatientId && !!date && !!time;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Book Appointment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book Appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Patient selection */}
          {patientId ? (
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Input value={patientName ?? ""} disabled />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="patient-select">Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger id="patient-select">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date picker */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date(new Date().toDateString())}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time picker */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-time">Time</Label>
            <Input
              id="appt-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="appt-reason">Reason for Visit</Label>
            <Input
              id="appt-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Follow-up, Routine check…"
              maxLength={200}
            />
          </div>

          <Button
            className="w-full"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Booking…" : "Confirm Appointment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
