import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PrescriptionProps {
  patient: {
    name: string;
    age: number;
    gender: string | null;
    phone: string | null;
  };
  visit: {
    visit_date: string;
    od_visual_acuity: string | null;
    od_sph: number | null;
    od_cyl: number | null;
    od_axis: number | null;
    od_iop: number | null;
    os_visual_acuity: string | null;
    os_sph: number | null;
    os_cyl: number | null;
    os_axis: number | null;
    os_iop: number | null;
    diagnosis: string | null;
    clinical_notes: string | null;
    next_appointment_date: string | null;
    created_at: string;
  };
}

function fmt(v: number | null | undefined) {
  if (v == null) return "—";
  return v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2);
}

export function Prescription({ patient, visit }: PrescriptionProps) {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  return (
    <div id="prescription-section">
      {/* Print button — hidden during print */}
      <div className="mb-4 flex justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Prescription
        </Button>
      </div>

      {/* Printable content */}
      <div className="rounded-lg border bg-white p-8 text-gray-900 print:border-none print:shadow-none print:p-0">
        {/* Clinic Header */}
        <header className="mb-6 border-b border-gray-200 pb-4 flex items-start justify-between">
          <div className="flex-shrink-0">
            {profile?.logo_url ? (
              <img
                src={profile.logo_url}
                alt="Clinic Logo"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">
                👁
              </div>
            )}
          </div>
          <div className="text-right space-y-0.5">
            <h2 className="text-lg font-bold tracking-tight">
              {profile?.clinic_name || "Clinic Name"}
            </h2>
            {profile?.clinic_address && (
              <p className="text-sm text-gray-500">{profile.clinic_address}</p>
            )}
            {profile?.clinic_phone && (
              <p className="text-sm text-gray-500">{profile.clinic_phone}</p>
            )}
            {profile?.license_number && (
              <p className="text-xs text-gray-400">License # {profile.license_number}</p>
            )}
          </div>
        </header>

        {/* Patient Info & Date */}
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-1 text-sm">
            <p><span className="font-semibold">Patient:</span> {patient.name}</p>
            <p><span className="font-semibold">Age:</span> {patient.age} yrs{patient.gender ? ` · ${patient.gender}` : ""}</p>
            {patient.phone && <p><span className="font-semibold">Phone:</span> {patient.phone}</p>}
          </div>
          <div className="text-right text-sm">
            <p><span className="font-semibold">Date:</span> {format(new Date(visit.visit_date), "MMMM d, yyyy")}</p>
          </div>
        </div>

        

        {/* Refraction Table */}
        <table className="mb-6 w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-200 px-3 py-2 text-left font-semibold">Eye</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">VA</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">Sph</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">Cyl</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">Axis</th>
              <th className="border border-gray-200 px-3 py-2 text-center font-semibold">IOP (mmHg)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-200 px-3 py-2 font-semibold">OD (Right)</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.od_visual_acuity || "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.od_sph)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.od_cyl)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.od_axis != null ? `${visit.od_axis}°` : "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.od_iop != null ? visit.od_iop : "—"}</td>
            </tr>
            <tr>
              <td className="border border-gray-200 px-3 py-2 font-semibold">OS (Left)</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.os_visual_acuity || "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.os_sph)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{fmt(visit.os_cyl)}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.os_axis != null ? `${visit.os_axis}°` : "—"}</td>
              <td className="border border-gray-200 px-3 py-2 text-center">{visit.os_iop != null ? visit.os_iop : "—"}</td>
            </tr>
          </tbody>
        </table>

        {/* Diagnosis & Notes */}
        {visit.diagnosis && (
          <div className="mb-4">
            <p className="text-sm font-semibold">Diagnosis</p>
            <p className="mt-1 text-sm whitespace-pre-line">{visit.diagnosis}</p>
          </div>
        )}
        {visit.clinical_notes && (
          <div className="mb-4">
            <p className="text-sm font-semibold">Clinical Notes</p>
            <p className="mt-1 text-sm whitespace-pre-line">{visit.clinical_notes}</p>
          </div>
        )}

        {/* Next Appointment */}
        {visit.next_appointment_date && (
          <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-700">Next Appointment</p>
            <p className="mt-1 text-sm">{format(new Date(visit.next_appointment_date), "MMMM d, yyyy")}</p>
          </div>
        )}

        {/* Doctor Signature */}
        <div className="mt-12 flex justify-end">
          <div className="w-56 text-center">
            {profile?.signature_url ? (
              <img
                src={profile.signature_url}
                alt="Doctor Signature"
                className="mx-auto mb-1 h-16 w-auto object-contain"
              />
            ) : (
              <div className="h-16" />
            )}
            <div className="border-t border-gray-300 pt-2 text-sm font-medium">
              {profile?.doctor_name || "Doctor's Signature"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
