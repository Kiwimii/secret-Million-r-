# Supabase-Datenbank-Deployment

- Status: erfolgreich
- Zeitpunkt (UTC): 2026-08-08T13:25:22Z
- Commit: 688a8cb9886b6953399aa7a71c7ad7118e515cc8
- Secrets geprüft: success
- Projektverknüpfung: success
- Migrationsvorschau: success
- Migration angewendet: success

## Letzte Diagnosezeilen
```text
--- supabase-link.log ---
Finished supabase link.
--- supabase-preview.log ---
NotFound: FileSystem.readFile (/home/runner/.supabase/profile)
Using database password *** env var...
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
Would push these migrations:
 • 20260808132500_meta_game_v2_note_audit_fix.sql
Finished supabase db push.
--- supabase-apply.log ---
NotFound: FileSystem.readFile (/home/runner/.supabase/profile)
Using database password *** env var...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • 20260808132500_meta_game_v2_note_audit_fix.sql
 [Y/n] 
Applying migration 20260808132500_meta_game_v2_note_audit_fix.sql...
v1.74.3: Pulling from supabase/edge-runtime
597c6c618d36: Pulling fs layer
c39190ba742d: Pulling fs layer
60414ed24b30: Pulling fs layer
0d29c829782d: Pulling fs layer
662b1f44f1ee: Pulling fs layer
ba9e24d39072: Pulling fs layer
0d29c829782d: Waiting
662b1f44f1ee: Waiting
ba9e24d39072: Waiting
60414ed24b30: Verifying Checksum
60414ed24b30: Download complete
597c6c618d36: Verifying Checksum
597c6c618d36: Download complete
c39190ba742d: Verifying Checksum
c39190ba742d: Download complete
0d29c829782d: Verifying Checksum
0d29c829782d: Download complete
ba9e24d39072: Verifying Checksum
ba9e24d39072: Download complete
662b1f44f1ee: Verifying Checksum
662b1f44f1ee: Download complete
597c6c618d36: Pull complete
c39190ba742d: Pull complete
60414ed24b30: Pull complete
0d29c829782d: Pull complete
662b1f44f1ee: Pull complete
ba9e24d39072: Pull complete
Digest: sha256:c52405002a890ca9fcf77978671c57f3a988e03174afb277f84ac65bc917013c
Status: Downloaded newer image for ghcr.io/supabase/edge-runtime:v1.74.3
ghcr.io/supabase/edge-runtime:v1.74.3
Finished supabase db push.
```
