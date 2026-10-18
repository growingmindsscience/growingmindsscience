-- Growing Minds Science: public storage bucket for Instagram renders.
-- Project: kxljngtmnqarvsawakmf (the science site). Run once in the SQL editor.
--
-- The Instagram Graph API fetches media by public URL at publish time, so renders
-- are uploaded here by marketing/instagram/scripts/publish.mjs with the service role
-- key. Reads are public; no policies grant writes to anon or authenticated users, so
-- only the service role can upload or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social', 'social', true, 104857600, array['image/jpeg', 'video/mp4'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
