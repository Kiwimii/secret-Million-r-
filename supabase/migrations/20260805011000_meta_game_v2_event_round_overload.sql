-- SQL integer literals are typed as integer, while the original event helper
-- accepted only smallint round values. Provide a safe overload so SECURITY
-- DEFINER RPCs resolve calls consistently without relying on implicit casts.

create or replace function public.meta_emit_event(
  target_game_id uuid,
  target_round integer,
  event_visibility text,
  target_member uuid,
  event_name text,
  event_title text,
  event_body text,
  event_severity text default 'info',
  event_payload jsonb default '{}'::jsonb
)
returns bigint
language sql
security definer
set search_path = public
as $$
  select public.meta_emit_event(
    target_game_id,
    target_round::smallint,
    event_visibility,
    target_member,
    event_name,
    event_title,
    event_body,
    event_severity,
    event_payload
  );
$$;

revoke execute on function public.meta_emit_event(uuid, integer, text, uuid, text, text, text, text, jsonb)
  from public, anon, authenticated;
