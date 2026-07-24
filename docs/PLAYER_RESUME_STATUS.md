# Spieler-Wiedereintritt-Prüfung

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T11:17:26Z
- Commit: efa2a69a2b5cef29713f5e502123fa297f3e582d
- Browser-Konfiguration: success
- Code, Profildropdown und PIN-Wiedereintritt: failure

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
