import { useState, useMemo, useEffect, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, Save, CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type EyeFields = { visual_acuity: string; sph: string; cyl: string; axis: string; iop: string };

type VisitForm = {
  od: EyeFields;
  os: EyeFields;
  diagnosis: string;
  clinical_notes: string;
  next_appointment_date: Date | undefined;
};

const emptyEye: EyeFields = { visual_acuity: "", sph: "", cyl: "", axis: "", iop: "" };

const RANGES: Record<string, { min: number; max: number; label: string }> = {
  sph: { min: -25, max: 25, label: "Sph must be between -25.00 and +25.00" },
  cyl: { min: -25, max: 25, label: "Cyl must be between -25.00 and +25.00" },
  axis: { min: 1, max: 180, label: "Axis must be a whole number between 1 and 180" },
  iop: { min: 0, max: 80, label: "IOP must be between 0 and 80" },
};

function validateSphCyl(value: string): string | null {
  if (value === "") return null;
  if (!/^[+-]/.test(value)) return "Must start with + or − sign (e.g. +2.00 or -1.50)";
  const n = Number(value);
  if (isNaN(n)) return "Invalid number";
  if (n < -25 || n > 25) return "Must be between -25.00 and +25.00";
  return null;
}

function validateAxis(value: string): string | null {
  if (value === "") return null;
  const n = Number(value);
  if (isNaN(n) || !Number.isInteger(n)) return "Axis must be a whole number";
  if (n < 1 || n > 180) return "Axis must be between 1 and 180";
  return null;
}

function validateNumericField(field: string, value: string): string | null {
  if (value === "") return null;
  if (field === "sph" || field === "cyl") return validateSphCyl(value);
  if (field === "axis") return validateAxis(value);
  const n = Number(value);
  if (isNaN(n)) return "Invalid value";
  const range = RANGES[field];
  if (range && (n < range.min || n > range.max)) return range.label;
  return null;
}

/** Format Sph/Cyl on blur: ensure +/- prefix and .00 decimals */
function formatSphCyl(value: string): string {
  if (value === "") return "";
  const n = Number(value);
  if (isNaN(n)) return value;
  return n >= 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
}

function getEyeErrors(eye: EyeFields): Record<string, string | null> {
  return {
    sph: validateNumericField("sph", eye.sph),
    cyl: validateNumericField("cyl", eye.cyl),
    axis: validateNumericField("axis", eye.axis),
    iop: validateNumericField("iop", eye.iop),
  };
}

function ValidatedInput({
  id,
  type,
  step,
  min,
  max,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
}: {
  id: string;
  type?: string;
  step?: string;
  min?: number;
  max?: number;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error: string | null;
}) {
  return (
    <div>
      <Input
        id={id}
        type={type}
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        className={cn(error && "border-destructive ring-1 ring-destructive")}
        aria-invalid={!!error}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function EyeSection({
  label,
  side,
  data,
  errors,
  onChange,
  onBlurFormat,
}: {
  label: string;
  side: "od" | "os";
  data: EyeFields;
  errors: Record<string, string | null>;
  onChange: (side: "od" | "os", field: string, value: string) => void;
  onBlurFormat: (side: "od" | "os", field: string) => void;
}) {
  return (
    <Card className="flex-1" role="group" aria-label={label}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor={`${side}-va`}>Visual Acuity</Label>
          <Input
            id={`${side}-va`}
            value={data.visual_acuity}
            onChange={(e) => onChange(side, "visual_acuity", e.target.value)}
            placeholder="e.g. 6/6, 6/12"
            aria-label={`${label} Visual Acuity`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${side}-sph`}>Spherical (Sph)</Label>
            <ValidatedInput
              id={`${side}-sph`}
              type="text"
              value={data.sph}
              onChange={(v) => onChange(side, "sph", v)}
              onBlur={() => onBlurFormat(side, "sph")}
              placeholder="+0.00 or -0.00"
              error={errors.sph}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${side}-cyl`}>Cylindrical (Cyl)</Label>
            <ValidatedInput
              id={`${side}-cyl`}
              type="text"
              value={data.cyl}
              onChange={(v) => onChange(side, "cyl", v)}
              onBlur={() => onBlurFormat(side, "cyl")}
              placeholder="+0.00 or -0.00"
              error={errors.cyl}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${side}-axis`}>Axis (°)</Label>
            <ValidatedInput
              id={`${side}-axis`}
              type="number"
              min={1}
              max={180}
              step="1"
              value={data.axis}
              onChange={(v) => onChange(side, "axis", v)}
              placeholder="1–180"
              error={errors.axis}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${side}-iop`}>IOP (mmHg)</Label>
            <ValidatedInput
              id={`${side}-iop`}
              type="number"
              step="0.1"
              value={data.iop}
              onChange={(v) => onChange(side, "iop", v)}
              placeholder="e.g. 15.0"
              error={errors.iop}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EyeExamForm({ patientId }: { patientId: string }) {
  const STORAGE_KEY = `eye_visit_draft_${patientId}`;

  const loadDraft = (): VisitForm => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...parsed,
          next_appointment_date: parsed.next_appointment_date
            ? new Date(parsed.next_appointment_date)
            : undefined,
        };
      }
    } catch {}
    return { od: { ...emptyEye }, os: { ...emptyEye }, diagnosis: "", clinical_notes: "", next_appointment_date: undefined };
  };

  const [form, setForm] = useState<VisitForm>(loadDraft);
  const [hasDraft, setHasDraft] = useState(() => !!localStorage.getItem(`eye_visit_draft_${patientId}`));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Auto-save to localStorage on every change
  useEffect(() => {
    const isEmpty =
      !form.od.visual_acuity && !form.od.sph && !form.od.cyl && !form.od.axis && !form.od.iop &&
      !form.os.visual_acuity && !form.os.sph && !form.os.cyl && !form.os.axis && !form.os.iop &&
      !form.diagnosis && !form.clinical_notes && !form.next_appointment_date;

    if (isEmpty) {
      localStorage.removeItem(STORAGE_KEY);
      setHasDraft(false);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      setHasDraft(true);
    }
  }, [form, STORAGE_KEY]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setHasDraft(false);
  }, [STORAGE_KEY]);

  const handleEyeChange = (side: "od" | "os", field: string, value: string) => {
    setForm((prev) => ({ ...prev, [side]: { ...prev[side], [field]: value } }));
  };

  const handleBlurFormat = (side: "od" | "os", field: string) => {
    if (field === "sph" || field === "cyl") {
      setForm((prev) => ({
        ...prev,
        [side]: { ...prev[side], [field]: formatSphCyl(prev[side][field as keyof EyeFields]) },
      }));
    }
  };

  const odErrors = useMemo(() => getEyeErrors(form.od), [form.od]);
  const osErrors = useMemo(() => getEyeErrors(form.os), [form.os]);

  const hasValidationErrors = useMemo(() => {
    return [...Object.values(odErrors), ...Object.values(osErrors)].some((e) => e !== null);
  }, [odErrors, osErrors]);

  const toNum = (v: string) => (v === "" ? undefined : Number(v));

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("eye_visits").insert({
        patient_id: patientId,
        od_visual_acuity: form.od.visual_acuity || null,
        od_sph: toNum(form.od.sph) ?? null,
        od_cyl: toNum(form.od.cyl) ?? null,
        od_axis: toNum(form.od.axis) ?? null,
        od_iop: toNum(form.od.iop) ?? null,
        os_visual_acuity: form.os.visual_acuity || null,
        os_sph: toNum(form.os.sph) ?? null,
        os_cyl: toNum(form.os.cyl) ?? null,
        os_axis: toNum(form.os.axis) ?? null,
        os_iop: toNum(form.os.iop) ?? null,
        diagnosis: form.diagnosis || null,
        clinical_notes: form.clinical_notes || null,
        next_appointment_date: form.next_appointment_date
          ? format(form.next_appointment_date, "yyyy-MM-dd")
          : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eye_visits", patientId] });
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      clearDraft();
      setForm({ od: { ...emptyEye }, os: { ...emptyEye }, diagnosis: "", clinical_notes: "", next_appointment_date: undefined });
      toast({ title: "Visit recorded successfully" });
    },
    onError: (error) => {
      toast({ title: "Error saving visit", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasValidationErrors) return;
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasDraft && (
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
          <span>📝 Unsaved draft restored from your last session.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={() => {
              clearDraft();
              setForm({ od: { ...emptyEye }, os: { ...emptyEye }, diagnosis: "", clinical_notes: "", next_appointment_date: undefined });
            }}
          >
            Discard
          </Button>
        </div>
      )}
      {/* OD / OS side-by-side */}
      <div className="grid gap-4 md:grid-cols-2">
        <EyeSection label="Right Eye (OD)" side="od" data={form.od} errors={odErrors} onChange={handleEyeChange} onBlurFormat={handleBlurFormat} />
        <EyeSection label="Left Eye (OS)" side="os" data={form.os} errors={osErrors} onChange={handleEyeChange} onBlurFormat={handleBlurFormat} />
      </div>

      <Separator />

      {/* Diagnosis & Notes */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="diagnosis">Diagnosis</Label>
          <Textarea
            id="diagnosis"
            value={form.diagnosis}
            onChange={(e) => setForm((p) => ({ ...p, diagnosis: e.target.value }))}
            placeholder="e.g. Myopia, Hypermetropia, Cataract…"
            rows={4}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clinical_notes">Clinical Notes</Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {["Normal Anterior Exam", "DFE: WNL", "No Diabetic Retinopathy", "Cataract - Mild"].map((note) => (
              <Button
                key={note}
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 rounded-full text-xs px-3"
                onClick={() => {
                  setForm((p) => ({
                    ...p,
                    clinical_notes: p.clinical_notes
                      ? p.clinical_notes + "\n" + note
                      : note,
                  }));
                }}
              >
                {note}
              </Button>
            ))}
          </div>
          <Textarea
            id="clinical_notes"
            value={form.clinical_notes}
            onChange={(e) => setForm((p) => ({ ...p, clinical_notes: e.target.value }))}
            placeholder="Additional observations, follow-up plan…"
            rows={4}
          />
        </div>
      </div>

      {/* Next Appointment */}
      <div className="space-y-1.5">
        <Label htmlFor="next-appointment">Next Appointment</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="next-appointment"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal sm:w-[280px]",
                !form.next_appointment_date && "text-muted-foreground"
              )}
              aria-label="Select next appointment date"
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {form.next_appointment_date
                ? format(form.next_appointment_date, "PPP")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={form.next_appointment_date}
              onSelect={(date) => setForm((p) => ({ ...p, next_appointment_date: date }))}
              disabled={(date) => date < new Date()}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      <Button type="submit" disabled={mutation.isPending || hasValidationErrors} className="w-full sm:w-auto">
        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
        {mutation.isPending ? "Saving…" : "Save Visit"}
      </Button>
    </form>
  );
}
