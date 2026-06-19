ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS preferred_channel text
CHECK (preferred_channel IN ('email', 'whatsapp', 'telefone', 'outro'));

ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS notes text;

UPDATE public.leads
SET preferred_channel = COALESCE(preferred_channel, 'email')
WHERE preferred_channel IS NULL;