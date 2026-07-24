# Live-Partie-Smoke-Test

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T04:05:39Z
- Commit: 525be1d3baf0f46f145d076eeb610bd3cb36e325
- Browser-Konfiguration: success
- Partie erstellen, Host-PIN, Spielerbeitritt und Spieler-PIN: failure

## Letzte Diagnosezeilen
```text
Versuch 1/6 fehlgeschlagen: permission denied for table games
Versuch 2/6 fehlgeschlagen: permission denied for table games
Versuch 3/6 fehlgeschlagen: permission denied for table games
Versuch 4/6 fehlgeschlagen: permission denied for table games
Versuch 5/6 fehlgeschlagen: permission denied for table games
Versuch 6/6 fehlgeschlagen: permission denied for table games
{
  code: '42501',
  details: null,
  hint: 'Grant the required privileges to the current role with: GRANT SELECT, DELETE ON public.games TO authenticated;',
  message: 'permission denied for table games'
}
```
