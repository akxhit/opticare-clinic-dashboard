
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
