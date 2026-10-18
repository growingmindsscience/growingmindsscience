-- Growing Minds AI: one shared count of free questions per visitor per day.
--
-- The main site's AI endpoint (api/growing-minds-ai.js) runs on many Edge
-- isolates, so its in-memory daily allowance resets on every cold start and
-- is not shared between regions. This table is the shared counter it uses
-- when AI_USAGE_SUPABASE_URL and AI_USAGE_SUPABASE_SERVICE_ROLE_KEY are set.
--
-- key_hash is an HMAC of (the UTC day, the visitor's network address), keyed
-- by a server secret: it cannot be turned back into an address and cannot be
-- linked across days. Rows older than two days are swept as the table is used.

create table if not exists public.ai_free_usage (
  day date not null,
  key_hash text not null check (length(key_hash) between 16 and 128),
  count integer not null default 0 check (count >= 0),
  primary key (day, key_hash)
);

-- RLS on with no policies: only the service role (which bypasses RLS) reads
-- or writes it, through the two functions below.
alter table public.ai_free_usage enable row level security;

-- Takes one of today's free questions. True when one was left (and is now
-- counted), false when the visitor is at the limit. Atomic under concurrency:
-- the conditional upsert either increments below the limit or returns no row.
create or replace function public.ai_take_free_question(p_key_hash text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  taken boolean;
begin
  insert into public.ai_free_usage as u (day, key_hash, count)
  values ((now() at time zone 'utc')::date, p_key_hash, 1)
  on conflict (day, key_hash) do update
    set count = u.count + 1
    where u.count < p_limit
  returning true into taken;

  if random() < 0.02 then
    delete from public.ai_free_usage where day < (now() at time zone 'utc')::date - 2;
  end if;

  return coalesce(taken, false) and p_limit > 0;
end;
$$;

-- Gives today's question back when the model never started answering.
create or replace function public.ai_refund_free_question(p_key_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_free_usage
     set count = count - 1
   where day = (now() at time zone 'utc')::date
     and key_hash = p_key_hash
     and count > 0;
$$;

revoke all on function public.ai_take_free_question(text, integer) from public, anon, authenticated;
revoke all on function public.ai_refund_free_question(text) from public, anon, authenticated;
grant execute on function public.ai_take_free_question(text, integer) to service_role;
grant execute on function public.ai_refund_free_question(text) to service_role;
