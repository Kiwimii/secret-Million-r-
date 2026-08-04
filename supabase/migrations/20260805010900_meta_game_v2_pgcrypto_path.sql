-- Supabase installs pgcrypto functions in the extensions schema.
-- Keep SECURITY DEFINER functions locked down while explicitly allowing
-- only the schemas they need for password hashing.

alter function public.meta_create_game(text, text, integer, text, text)
  set search_path = public, extensions;

alter function public.meta_join_game(text, text, text, text)
  set search_path = public, extensions;

alter function public.meta_resume_host(text, text)
  set search_path = public, extensions;
