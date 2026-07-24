-- Supabase installiert pgcrypto üblicherweise im Schema extensions.
-- Die Live-RPCs liefen bisher mit search_path = public und konnten deshalb
-- gen_salt() und crypt() nicht zuverlässig auflösen.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter function public.create_live_game(text, text)
  set search_path = public, extensions;

alter function public.join_or_resume_live_game(text, text, text, text)
  set search_path = public, extensions;

alter function public.resume_live_host(text, text)
  set search_path = public, extensions;

comment on function public.create_live_game(text, text) is
  'Erstellt eine Live-Partie; der Suchpfad enthält pgcrypto für sichere PIN-Hashes.';

comment on function public.join_or_resume_live_game(text, text, text, text) is
  'Erstellt oder öffnet ein Spielerprofil; der Suchpfad enthält pgcrypto für sichere PIN-Hashes.';

comment on function public.resume_live_host(text, text) is
  'Öffnet die Spielleitung erneut; der Suchpfad enthält pgcrypto für die PIN-Prüfung.';
