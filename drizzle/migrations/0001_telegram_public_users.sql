CREATE TABLE public.telegram_users (telegram_id bigint PRIMARY KEY CHECK (telegram_id > 0), created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.telegram_users TO service_role;
REVOKE ALL ON public.telegram_users FROM anon, authenticated;
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.telegram_verified IS 'DEPRECATED: phone allowlist replaced by Telegram sender identity in telegram_users';