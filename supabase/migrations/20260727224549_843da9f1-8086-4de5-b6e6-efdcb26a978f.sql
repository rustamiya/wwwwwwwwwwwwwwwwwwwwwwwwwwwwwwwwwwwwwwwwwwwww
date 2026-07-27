CREATE TABLE public.game_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  note text,
  contact text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.game_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.game_requests TO authenticated;
GRANT ALL ON public.game_requests TO service_role;

ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a request" ON public.game_requests
  FOR INSERT TO anon, authenticated WITH CHECK (
    length(btrim(title)) > 0 AND length(title) <= 120
    AND (note IS NULL OR length(note) <= 1000)
    AND (contact IS NULL OR length(contact) <= 200)
    AND status = 'new'
  );

CREATE POLICY "Admins can view requests" ON public.game_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update requests" ON public.game_requests
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete requests" ON public.game_requests
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER game_requests_set_updated_at
  BEFORE UPDATE ON public.game_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();