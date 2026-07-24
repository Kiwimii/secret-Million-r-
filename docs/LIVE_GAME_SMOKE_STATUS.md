# Live-Partie-Smoke-Test

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T07:25:22Z
- Commit: 4e8d1bc6e2d8ae0d4a96e201d057317309858933
- Browser-Konfiguration: success
- Partie, PINs sowie Mission- und Challenge-Auswahl: failure

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
  hint: 'Grant the required privileges to the current role with: GRANT SELECT ON public.games TO authenticated;',
  message: 'permission denied for table games'
}
```
