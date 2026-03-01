import { Database } from "@/integrations/supabase/types";

export type Patient = Database["public"]["Tables"]["patients"]["Row"];
export type InsertPatient = Database["public"]["Tables"]["patients"]["Insert"];
export type UpdatePatient = Database["public"]["Tables"]["patients"]["Update"];

export type Visit = Database["public"]["Tables"]["eye_visits"]["Row"];
export type InsertVisit = Database["public"]["Tables"]["eye_visits"]["Insert"];
export type UpdateVisit = Database["public"]["Tables"]["eye_visits"]["Update"];

export type DoctorProfile = Database["public"]["Tables"]["profiles"]["Row"];
export type InsertDoctorProfile = Database["public"]["Tables"]["profiles"]["Insert"];
export type UpdateDoctorProfile = Database["public"]["Tables"]["profiles"]["Update"];

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type InsertAppointment = Database["public"]["Tables"]["appointments"]["Insert"];
export type UpdateAppointment = Database["public"]["Tables"]["appointments"]["Update"];

/**
 * Composite type for a Visit as it appears in the Prescription component,
 * including related patient data and doctor profile.
 */
export interface Prescription {
    patient: Pick<Patient, "name" | "age" | "gender" | "phone">;
    visit: Visit;
    profile: Partial<DoctorProfile>;
}

/**
 * Type for Patient with nested visits, commonly used in the dashboard.
 */
export type PatientWithVisits = Patient & {
    eye_visits?: Pick<Visit, "diagnosis">[];
};
