# Live-Partie-Smoke-Test

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T03:57:41Z
- Commit: 55da8f4206c1cc746962b4c46c4582ee161a1208
- Browser-Konfiguration: success
- Partie erstellen, Host-PIN, Spielerbeitritt und Spieler-PIN: failure

## Letzte Diagnosezeilen
```text
Versuch 1/6 fehlgeschlagen: column reference "game_id" is ambiguous
Versuch 2/6 fehlgeschlagen: column reference "game_id" is ambiguous
Versuch 3/6 fehlgeschlagen: column reference "game_id" is ambiguous
Versuch 4/6 fehlgeschlagen: column reference "game_id" is ambiguous
Versuch 5/6 fehlgeschlagen: column reference "game_id" is ambiguous
Versuch 6/6 fehlgeschlagen: column reference "game_id" is ambiguous
{
  code: '42702',
  details: 'It could refer to either a PL/pgSQL variable or a table column.',
  hint: null,
  message: 'column reference "game_id" is ambiguous'
}
```
