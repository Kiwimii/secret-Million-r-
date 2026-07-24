# Live-Partie-Smoke-Test

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T04:09:41Z
- Commit: c352acc5f62269fb072502288e25f21dc79683cc
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
