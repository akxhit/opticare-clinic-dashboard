-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  phone TEXT,
  last_visit_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Public access policies (clinic internal tool)
CREATE POLICY "Allow public read" ON public.patients FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.patients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.patients FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();ALTER TABLE public.patients ADD COLUMN gender text, ADD COLUMN email text, ADD COLUMN medical_history text;CREATE TABLE public.eye_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  od_visual_acuity TEXT,
  od_sph NUMERIC(6,2),
  od_cyl NUMERIC(6,2),
  od_axis INTEGER,
  od_iop NUMERIC(5,1),
  os_visual_acuity TEXT,
  os_sph NUMERIC(6,2),
  os_cyl NUMERIC(6,2),
  os_axis INTEGER,
  os_iop NUMERIC(5,1),
  diagnosis TEXT,
  clinical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eye_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON public.eye_visits FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON public.eye_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.eye_visits FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON public.eye_visits FOR DELETE USING (true);

CREATE TRIGGER update_eye_visits_updated_at
  BEFORE UPDATE ON public.eye_visits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();ALTER TABLE public.eye_visits ADD COLUMN next_appointment_date date;ALTER TABLE public.patients ADD COLUMN is_active boolean NOT NULL DEFAULT true;ALTER TABLE public.patients ADD COLUMN doctor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;-- Profiles table for doctor/clinic info
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name text,
  clinic_name text,
  license_number text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Logo storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

CREATE POLICY "Users can upload own logo" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own logo" ON storage.objects FOR UPDATE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own logo" ON storage.objects FOR DELETE USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public logo read" ON storage.objects FOR SELECT USING (bucket_id = 'logos');
-- Add new columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clinic_phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url text;

-- Create clinic_assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('clinic_assets', 'clinic_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clinic_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'clinic_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'clinic_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read clinic assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clinic_assets');

CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can read own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own appointments"
  ON public.appointments FOR DELETE
  USING (auth.uid() = doctor_id);

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.appointments
ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled';

-- Update patients RLS: restrict to doctor's own patients
DROP POLICY IF EXISTS "Allow public read" ON public.patients;
DROP POLICY IF EXISTS "Allow public insert" ON public.patients;
DROP POLICY IF EXISTS "Allow public update" ON public.patients;
DROP POLICY IF EXISTS "Allow public delete" ON public.patients;

CREATE POLICY "Doctors can read own patients"
  ON public.patients FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own patients"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own patients"
  ON public.patients FOR UPDATE
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can delete own patients"
  ON public.patients FOR DELETE
  USING (auth.uid() = doctor_id);

-- Update eye_visits RLS: restrict to visits belonging to doctor's patients
DROP POLICY IF EXISTS "Allow public read" ON public.eye_visits;
DROP POLICY IF EXISTS "Allow public insert" ON public.eye_visits;
DROP POLICY IF EXISTS "Allow public update" ON public.eye_visits;
DROP POLICY IF EXISTS "Allow public delete" ON public.eye_visits;

CREATE POLICY "Doctors can read own patient visits"
  ON public.eye_visits FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = eye_visits.patient_id AND patients.doctor_id = auth.uid()));

CREATE POLICY "Doctors can insert own patient visits"
  ON public.eye_visits FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = eye_visits.patient_id AND patients.doctor_id = auth.uid()));

CREATE POLICY "Doctors can update own patient visits"
  ON public.eye_visits FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = eye_visits.patient_id AND patients.doctor_id = auth.uid()));

CREATE POLICY "Doctors can delete own patient visits"
  ON public.eye_visits FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.patients WHERE patients.id = eye_visits.patient_id AND patients.doctor_id = auth.uid()));
