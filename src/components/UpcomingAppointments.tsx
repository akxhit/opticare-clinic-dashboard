import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export function UpcomingAppointments() {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["upcoming_appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eye_visits")
        .select("id, next_appointment_date, patient_id, patients(name)")
        .gte("next_appointment_date", today)
        .order("next_appointment_date", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : appointments && appointments.length > 0 ? (
          <ul className="space-y-2" role="list" aria-label="Upcoming appointments">
            {appointments.map((apt) => (
              <li key={apt.id}>
                <button
                  onClick={() => navigate(`/patients/${apt.patient_id}`)}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label={`Appointment for ${(apt.patients as any)?.name} on ${format(new Date(apt.next_appointment_date!), "MMM d, yyyy")}`}
                >
                  <span className="font-medium">{(apt.patients as any)?.name}</span>
                  <span className="text-muted-foreground">
                    {format(new Date(apt.next_appointment_date!), "MMM d, yyyy")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No upcoming appointments.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
