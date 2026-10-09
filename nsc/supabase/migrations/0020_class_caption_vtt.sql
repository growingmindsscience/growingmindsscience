-- Corrected English captions for a lesson, built from its written version with
-- Mux's cue timing (app/api/admin/classes/captions). Mux fetches the file once,
-- through a signed one-hour URL, when the uploaded caption track is added.
alter table public.class_lessons add column if not exists caption_vtt text;
