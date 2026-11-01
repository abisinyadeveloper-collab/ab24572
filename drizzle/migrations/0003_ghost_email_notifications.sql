ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
ALTER TABLE public.ghost_media ADD COLUMN IF NOT EXISTS notified_at timestamptz;

CREATE TABLE public.ghost_notify_state (
  user_id uuid PRIMARY KEY,
  welcome_sent_at timestamptz,
  password_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ghost_notify_state TO service_role;
ALTER TABLE public.ghost_notify_state ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ghost_devices (
  user_id uuid NOT NULL,
  device_id text NOT NULL CHECK (char_length(device_id) BETWEEN 8 AND 80),
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
GRANT ALL ON public.ghost_devices TO service_role;
ALTER TABLE public.ghost_devices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ghost_media_pending_videos ON public.ghost_media (created_at) WHERE kind = 'video' AND status IN ('queued','in_progress');