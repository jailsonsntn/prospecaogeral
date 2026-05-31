CREATE INDEX idx_leads_owner_status ON public.leads(owner_id, status);
CREATE INDEX idx_leads_owner_source ON public.leads(owner_id, source);
CREATE INDEX idx_leads_external ON public.leads(source, external_id);
CREATE INDEX idx_notes_lead ON public.lead_notes(lead_id);
CREATE INDEX idx_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX idx_tasks_owner_status ON public.tasks(owner_id, status);
