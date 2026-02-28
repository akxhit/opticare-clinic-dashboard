import { useState, useMemo, useCallback } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User } from "lucide-react";
import { BookAppointmentDialog } from "@/components/BookAppointmentDialog";
import { AppointmentActionDialog, type AppointmentDetail } from "@/components/AppointmentActionDialog";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface AppointmentEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  patientName: string;
  patientId: string;
  reason: string | null;
  time: string;
  source: "visit" | "appointment";
}

function CustomEvent({ event }: { event: AppointmentEvent }) {
  return (
    <div className="flex items-center gap-1.5 truncate">
      <User className="h-3 w-3 shrink-0 opacity-80" />
      <span className="truncate font-medium">{event.patientName}</span>
      {event.reason && (
        <span className="truncate text-[10px] opacity-75">· {event.reason}</span>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState<AppointmentDetail | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: visitEvents = [], isLoading: loadingVisits } = useQuery({
    queryKey: ["calendar-visits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eye_visits")
        .select("id, next_appointment_date, patient_id, patients(name)")
        .not("next_appointment_date", "is", null);
      if (error) throw error;
      return (data ?? []).map((v: any) => {
        const d = new Date(v.next_appointment_date + "T09:00:00");
        return {
          id: v.id,
          title: v.patients?.name ?? "Unknown Patient",
          start: d,
          end: new Date(d.getTime() + 30 * 60 * 1000),
          patientName: v.patients?.name ?? "Unknown",
          patientId: v.patient_id,
          reason: null,
          time: "09:00",
          source: "visit" as const,
        };
      });
    },
    enabled: !!user?.id,
  });

  const { data: apptEvents = [], isLoading: loadingAppts } = useQuery({
    queryKey: ["calendar-appointments", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, reason, patient_id, status, patients(name)")
        .eq("doctor_id", user!.id)
        .neq("status", "cancelled");
      if (error) throw error;
      return (data ?? []).map((a: any) => {
        const d = new Date(`${a.appointment_date}T${a.appointment_time}`);
        const name = a.patients?.name ?? "Unknown Patient";
        return {
          id: a.id,
          title: a.reason ? `${name} — ${a.reason}` : name,
          start: d,
          end: new Date(d.getTime() + 30 * 60 * 1000),
          patientName: name,
          patientId: a.patient_id,
          reason: a.reason,
          time: a.appointment_time?.slice(0, 5) ?? "09:00",
          source: "appointment" as const,
        };
      });
    },
    enabled: !!user?.id,
  });

  const events = useMemo(() => [...visitEvents, ...apptEvents], [visitEvents, apptEvents]);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return events.filter((e) => e.start.toDateString() === today).length;
  }, [events]);

  const handleNavigate = useCallback((newDate: Date) => setDate(newDate), []);
  const handleViewChange = useCallback((newView: View) => setView(newView), []);

  const handleSelectEvent = useCallback((event: object) => {
    const e = event as AppointmentEvent;
    setSelectedAppt({
      id: e.id,
      patientId: e.patientId,
      patientName: e.patientName,
      reason: e.reason,
      date: e.start,
      time: e.time,
      source: e.source,
    });
    setDialogOpen(true);
  }, []);

  const navigatePrev = () => {
    const d = new Date(date);
    if (view === Views.DAY) d.setDate(d.getDate() - 1);
    else if (view === Views.WEEK) d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setDate(d);
  };

  const navigateNext = () => {
    const d = new Date(date);
    if (view === Views.DAY) d.setDate(d.getDate() + 1);
    else if (view === Views.WEEK) d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setDate(d);
  };

  const dateLabel = view === Views.DAY
    ? format(date, "EEEE, MMMM d, yyyy")
    : view === Views.WEEK
      ? `${format(startOfWeek(date), "MMM d")} – ${format(new Date(startOfWeek(date).getTime() + 6 * 86400000), "MMM d, yyyy")}`
      : format(date, "MMMM yyyy");

  const isLoading = loadingVisits || loadingAppts;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[650px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <div className="mt-1 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{format(new Date(), "EEEE, MMMM d")}</span>
            </div>
            {todayCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="mr-1 h-3 w-3" />
                {todayCount} today
              </Badge>
            )}
          </div>
        </div>
        <BookAppointmentDialog />
      </div>

      {/* Calendar Card */}
      <div className="rounded-xl border bg-card shadow-sm">
        {/* Navigation bar */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigatePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="ml-1 text-xs font-medium" onClick={() => setDate(new Date())}>
              Today
            </Button>
          </div>

          <h2 className="text-sm font-semibold tracking-tight">{dateLabel}</h2>

          <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-all ${
                  view === v
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar body */}
        <div className="modern-calendar p-2 sm:p-4">
          <BigCalendar
            localizer={localizer}
            events={events}
            date={date}
            view={view}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectEvent={handleSelectEvent}
            defaultDate={new Date()}
            style={{ height: 620 }}
            popup
            tooltipAccessor={(event) => (event as AppointmentEvent).patientName}
            components={{
              event: CustomEvent as any,
            }}
          />
        </div>
      </div>

      <AppointmentActionDialog
        appointment={selectedAppt}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
