CREATE TABLE public.telegram_media (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), telegram_id bigint NOT NULL REFERENCES public.telegram_users(telegram_id), update_id bigint NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('image','video','site')), prompt text NOT NULL, status text NOT NULL DEFAULT 'queued', gateway_id text, path text, error text, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.telegram_media TO service_role;
REVOKE ALL ON public.telegram_media FROM anon, authenticated;
ALTER TABLE public.telegram_media ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX telegram_one_active_video ON public.telegram_media ((kind)) WHERE kind = 'video' AND status IN ('queued','in_progress');
CREATE INDEX telegram_media_owner ON public.telegram_media(telegram_id, created_at DESC);