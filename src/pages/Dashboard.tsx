import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, CalendarDays, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientsTable } from "@/components/PatientsTable";
import { UpcomingAppointments } from "@/components/UpcomingAppointments";

export default function Dashboard() {
  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*");
      if (error) throw error;
      return data;
    },
  });

  const totalPatients = patients?.length ?? 0;
  const today = new Date().toISOString().split("T")[0];
  const todayVisits = patients?.filter((p) => p.last_visit_date === today).length ?? 0;
  const thisWeek = new Date();
  thisWeek.setDate(thisWeek.getDate() - 7);
  const newThisWeek = patients?.filter(
    (p) => new Date(p.created_at) >= thisWeek
  ).length ?? 0;

  const stats = [
    { label: "Total Patients", value: totalPatients, icon: Users },
    { label: "Today's Visits", value: todayVisits, icon: CalendarDays },
    { label: "New This Week", value: newThisWeek, icon: UserPlus },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to OptiCare Patient Management</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold">Recent Patients</h2>
          <PatientsTable />
        </div>
        <div>
          <UpcomingAppointments />
        </div>
      </div>
    </div>
  );
}
