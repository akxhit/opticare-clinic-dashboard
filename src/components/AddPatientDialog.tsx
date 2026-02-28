import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const patientSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(100, "Name must be under 100 characters"),
  age: z.number({ invalid_type_error: "Age is required" }).int().min(0, "Age must be 0 or above").max(150, "Age must be 150 or below"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().trim().max(20, "Phone number too long").optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email address").max(255).optional().or(z.literal("")),
  medical_history: z.string().trim().max(2000, "Medical history must be under 2000 characters").optional().or(z.literal("")),
});

type PatientForm = z.infer<typeof patientSchema>;

type FieldErrors = Partial<Record<keyof PatientForm, string>>;

export function AddPatientDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientForm>({
    name: "",
    age: "" as unknown as number,
    gender: "",
    phone: "",
    email: "",
    medical_history: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PatientForm, boolean>>>({});
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const validateField = (field: keyof PatientForm, value: unknown) => {
    const partial = { ...form, [field]: value };
    const ageVal = partial.age;
    const result = patientSchema.safeParse({
      ...partial,
      age: ageVal === undefined || String(ageVal) === "" ? undefined : Number(ageVal),
    });
    if (!result.success) {
      const fieldError = result.error.issues.find((i) => i.path[0] === field);
      setErrors((prev) => ({ ...prev, [field]: fieldError?.message }));
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleChange = (field: keyof PatientForm, value: string) => {
    const newVal = field === "age" ? (value === "" ? "" : Number(value)) : value;
    setForm((prev) => ({ ...prev, [field]: newVal as any }));
    if (touched[field]) {
      validateField(field, newVal);
    }
  };

  const handleBlur = (field: keyof PatientForm) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, form[field]);
  };

  const resetForm = () => {
    setForm({ name: "", age: "" as unknown as number, gender: "", phone: "", email: "", medical_history: "" });
    setErrors({});
    setTouched({});
  };

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof patientSchema>) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("You must be logged in to add a patient.");
      const { error } = await supabase.from("patients").insert({
        name: data.name,
        age: data.age,
        gender: data.gender,
        phone: data.phone || null,
        email: data.email || null,
        medical_history: data.medical_history || null,
        last_visit_date: new Date().toISOString().split("T")[0],
        doctor_id: authData.user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients_with_visits"] });
      setOpen(false);
      resetForm();
      toast({ title: "Patient added successfully" });
    },
    onError: (error) => {
      toast({ title: "Error adding patient", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ageVal = form.age;
    const parsed = patientSchema.safeParse({
      ...form,
      age: String(ageVal) === "" || ageVal === undefined ? undefined : Number(ageVal),
    });
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      const allTouched: typeof touched = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof PatientForm;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
        allTouched[key] = true;
      });
      setErrors(fieldErrors);
      setTouched(allTouched);
      return;
    }
    mutation.mutate(parsed.data);
  };

  const fieldClass = (field: keyof PatientForm) =>
    errors[field] && touched[field] ? "border-destructive focus-visible:ring-destructive" : "";

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <SheetTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add New Patient
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add New Patient</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Enter patient's full name"
              className={fieldClass("name")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              required
            />
            {errors.name && touched.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">{errors.name}</p>
            )}
          </div>

          {/* Age & Gender row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="age">Age <span className="text-destructive">*</span></Label>
              <Input
                id="age"
                type="number"
                min={0}
                max={150}
                value={form.age as any}
                onChange={(e) => handleChange("age", e.target.value)}
                onBlur={() => handleBlur("age")}
                placeholder="Age"
                className={fieldClass("age")}
                aria-invalid={!!errors.age}
                aria-describedby={errors.age ? "age-error" : undefined}
                required
              />
              {errors.age && touched.age && (
                <p id="age-error" className="text-sm text-destructive" role="alert">{errors.age}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
              <Select
                value={form.gender}
                onValueChange={(v) => { handleChange("gender", v); setTouched((p) => ({ ...p, gender: true })); }}
              >
                <SelectTrigger
                  id="gender"
                  className={fieldClass("gender")}
                  aria-invalid={!!errors.gender}
                  aria-describedby={errors.gender ? "gender-error" : undefined}
                >
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && touched.gender && (
                <p id="gender-error" className="text-sm text-destructive" role="alert">{errors.gender}</p>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              placeholder="Enter phone number"
              className={fieldClass("phone")}
            />
            {errors.phone && touched.phone && (
              <p className="text-sm text-destructive" role="alert">{errors.phone}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              placeholder="Enter email address"
              className={fieldClass("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {errors.email && touched.email && (
              <p id="email-error" className="text-sm text-destructive" role="alert">{errors.email}</p>
            )}
          </div>

          {/* Medical History */}
          <div className="space-y-1.5">
            <Label htmlFor="medical_history">General Medical History</Label>
            <Textarea
              id="medical_history"
              value={form.medical_history}
              onChange={(e) => handleChange("medical_history", e.target.value)}
              onBlur={() => handleBlur("medical_history")}
              placeholder="Note relevant conditions (e.g. Diabetes, Hypertension, Glaucoma history…)"
              rows={4}
              className={fieldClass("medical_history")}
            />
            {errors.medical_history && touched.medical_history && (
              <p className="text-sm text-destructive" role="alert">{errors.medical_history}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add Patient"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
