ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.text_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY leads_select_own ON public.leads FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY leads_insert_own ON public.leads FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY leads_update_own ON public.leads FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY leads_delete_own ON public.leads FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY tags_select_own ON public.tags FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY tags_insert_own ON public.tags FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY tags_update_own ON public.tags FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY tags_delete_own ON public.tags FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY lead_tags_select_own ON public.lead_tags FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
);
CREATE POLICY lead_tags_insert_own ON public.lead_tags FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
);
CREATE POLICY lead_tags_delete_own ON public.lead_tags FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
);

CREATE POLICY lead_notes_select_own ON public.lead_notes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
);
CREATE POLICY lead_notes_insert_own ON public.lead_notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
  AND author_id = auth.uid()
);
CREATE POLICY lead_notes_update_own ON public.lead_notes FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY lead_notes_delete_own ON public.lead_notes FOR DELETE USING (author_id = auth.uid());

CREATE POLICY lead_activities_select_own ON public.lead_activities FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
);
CREATE POLICY lead_activities_insert_own ON public.lead_activities FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads l WHERE l.id = lead_id AND l.owner_id = auth.uid())
  AND author_id = auth.uid()
);

CREATE POLICY text_templates_select_own ON public.text_templates FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY text_templates_insert_own ON public.text_templates FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY text_templates_update_own ON public.text_templates FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY text_templates_delete_own ON public.text_templates FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY ai_suggestions_select_own ON public.ai_suggestions FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY ai_suggestions_insert_own ON public.ai_suggestions FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY tasks_select_own ON public.tasks FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY tasks_insert_own ON public.tasks FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY tasks_update_own ON public.tasks FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY tasks_delete_own ON public.tasks FOR DELETE USING (owner_id = auth.uid());
