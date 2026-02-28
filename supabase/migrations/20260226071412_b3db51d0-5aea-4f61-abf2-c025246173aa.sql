CREATE TABLE public.eye_visits (
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
  EXECUTE FUNCTION public.update_updated_at_column();