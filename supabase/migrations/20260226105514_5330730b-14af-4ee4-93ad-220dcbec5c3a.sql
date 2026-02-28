
ALTER TABLE public.appointments
ADD COLUMN status TEXT NOT NULL DEFAULT 'scheduled';
