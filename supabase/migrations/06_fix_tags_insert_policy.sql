ALTER TABLE public.tags
ALTER COLUMN owner_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS tags_insert_own ON public.tags;

CREATE POLICY tags_insert_own ON public.tags
FOR INSERT
WITH CHECK (COALESCE(owner_id, auth.uid()) = auth.uid());