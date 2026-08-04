# Meta V2 Diagnose

- Ergebnis: failure
- Zeitpunkt: 2026-08-04T23:33:27Z

```text
OK auth host
RUN meta_create_game
DIAGNOSIS FAILURE: Error: meta_create_game: function public.meta_emit_event(uuid, integer, unknown, unknown, unknown, unknown, unknown, unknown, jsonb) does not exist
    at rpc (/home/runner/work/secret-Million-r-/secret-Million-r-/scripts/diagnose-meta-v2.cjs:20:27)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async run (/home/runner/work/secret-Million-r-/secret-Million-r-/scripts/diagnose-meta-v2.cjs:55:21)
```
