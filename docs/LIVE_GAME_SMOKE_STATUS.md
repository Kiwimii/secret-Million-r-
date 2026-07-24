# Live-Partie-Smoke-Test

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T04:13:09Z
- Commit: a1239016960062dbe5b6259a35e0ee9a94573266
- Browser-Konfiguration: success
- Partie erstellen, Host-PIN, Spielerbeitritt und Spieler-PIN: failure

## Letzte Diagnosezeilen
```text
Versuch 1/6 fehlgeschlagen: Could not find the function public.delete_own_live_game(target_game_id) in the schema cache
Versuch 2/6 fehlgeschlagen: Could not find the function public.delete_own_live_game(target_game_id) in the schema cache
Versuch 3/6 fehlgeschlagen: Could not find the function public.delete_own_live_game(target_game_id) in the schema cache
Versuch 4/6 fehlgeschlagen: Could not find the function public.delete_own_live_game(target_game_id) in the schema cache
Versuch 5/6 fehlgeschlagen: Could not find the function public.delete_own_live_game(target_game_id) in the schema cache
Versuch 6/6 fehlgeschlagen: Could not find the function public.delete_own_live_game(target_game_id) in the schema cache
{
  code: 'PGRST202',
  details: 'Searched for the function public.delete_own_live_game with parameter target_game_id or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.',
  hint: 'Perhaps you meant to call the function public.create_live_game',
  message: 'Could not find the function public.delete_own_live_game(target_game_id) in the schema cache'
}
```
