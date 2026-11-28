-- 0009: small story thumbnails, made once when a story arrives.
--
-- Why: cards loaded each source's full-size original (1280-1600px) into
-- 150-450px tiles, so pictures were slow (2026-11-28). The pipeline now
-- resizes each featured story's image to WebP at 640px and 1280px and stores
-- it in the public "thumbs" bucket under <article id>/640.webp and 1280.webp.
--
-- thumb_path: null = not made yet; the article id = both sizes stored;
-- '-' = the original couldn't be fetched or decoded (don't retry).
alter table public.articles add column if not exists thumb_path text;

-- Public bucket: anyone can read files by URL; only the service role (the
-- pipeline) can write, because there are no insert/update policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('thumbs', 'thumbs', true, 1048576, array['image/webp'])
on conflict (id) do nothing;
