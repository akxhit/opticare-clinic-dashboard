import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Play, CalendarClock, XCircle } from "lucide-react";

export interface AppointmentDetail {
  id: string;
  patientId: string;
  patientName: string;
  reason: string | null;
  date: Date;
  time: string;
  source: "visit" | "appointment";
}

interface Props {
  appointment: AppointmentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentActionDialog({ appointment, open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [newTime, setNewTime] = useState("");

  const close = () => {
    onOpenChange(false);
    setMode("view");
    setNewDate(undefined);
    setNewTime("");
  };

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointment!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      toast({ title: "Appointment cancelled" });
      close();
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_date: format(newDate!, "yyyy-MM-dd"),
          appointment_time: newTime,
        })
        .eq("id", appointment!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-appointments"] });
      toast({ title: "Appointment rescheduled" });
      close();
    },
    onError: (e) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (!appointment) return null;

  const isBookedAppointment = appointment.source === "appointment";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); else onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
        </DialogHeader>

        {mode === "view" ? (
          <div className="space-y-4 pt-2">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium">{appointment.patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{format(appointment.date, "PPP")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium">{appointment.time}</span>
              </div>
              {appointment.reason && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="font-medium">{appointment.reason}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                onClick={() => {
                  close();
                  navigate(`/patients/${appointment.patientId}`);
                }}
              >
                <Play className="mr-2 h-4 w-4" />
                Start Visit
              </Button>
              {isBookedAppointment && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setNewDate(appointment.date);
                      setNewTime(appointment.time);
                      setMode("reschedule");
                    }}
                  >
                    <CalendarClock className="mr-2 h-4 w-4" />
                    Reschedule
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate()}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {cancelMutation.isPending ? "Cancelling…" : "Cancel Appointment"}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>New Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDate ? format(newDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newDate}
                    onSelect={setNewDate}
                    disabled={(d) => d < new Date(new Date().toDateString())}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule-time">New Time</Label>
              <Input
                id="reschedule-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setMode("view")}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={!newDate || !newTime || rescheduleMutation.isPending}
                onClick={() => rescheduleMutation.mutate()}
              >
                {rescheduleMutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
