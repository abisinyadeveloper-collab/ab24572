ALTER TABLE public.ghost_media DROP CONSTRAINT ghost_media_kind_check;
ALTER TABLE public.ghost_media ADD CONSTRAINT ghost_media_kind_check CHECK (kind IN ('image', 'video', 'music'));