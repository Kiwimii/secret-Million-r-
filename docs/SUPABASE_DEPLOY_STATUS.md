# Supabase-Datenbank-Deployment

- Status: erfolgreich
- Zeitpunkt (UTC): 2026-08-05T08:07:36Z
- Commit: 8b1e40a5a01986ca24a787069a69aa397ca7cc8f
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
DRY RUN: migrations will *not* be pushed to the database.
Using database password *** env var...
Connecting to remote database...
Would push these migrations:
 • [1m20260805011300_meta_game_v2_visual_logic_hardening.sql[22m
 • [1m20260805011400_meta_game_v2_final_logic_hardening.sql[22m
Finished [36msupabase db push[39m.
--- supabase-apply.log ---
NotFound: FileSystem.readFile (/home/runner/.supabase/profile)
Using database password *** env var...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • [1m20260805011300_meta_game_v2_visual_logic_hardening.sql[22m
 • [1m20260805011400_meta_game_v2_final_logic_hardening.sql[22m
 [Y/n] 
Applying migration 20260805011300_meta_game_v2_visual_logic_hardening.sql...
Applying migration 20260805011400_meta_game_v2_final_logic_hardening.sql...
v1.74.2: Pulling from supabase/edge-runtime
b9136609bef0: Pulling fs layer
bfab333b5e81: Pulling fs layer
be4c37910e5f: Pulling fs layer
724041fce750: Pulling fs layer
abecb94bba46: Pulling fs layer
0367cb7f5023: Pulling fs layer
724041fce750: Waiting
abecb94bba46: Waiting
0367cb7f5023: Waiting
be4c37910e5f: Verifying Checksum
be4c37910e5f: Download complete
b9136609bef0: Verifying Checksum
b9136609bef0: Download complete
bfab333b5e81: Download complete
724041fce750: Verifying Checksum
724041fce750: Download complete
0367cb7f5023: Verifying Checksum
0367cb7f5023: Download complete
abecb94bba46: Verifying Checksum
abecb94bba46: Download complete
b9136609bef0: Pull complete
bfab333b5e81: Pull complete
be4c37910e5f: Pull complete
724041fce750: Pull complete
abecb94bba46: Pull complete
0367cb7f5023: Pull complete
Digest: sha256:a82676277615aee03c4f288cbbbf68dedb5ba8693073e567ab8dbfdd11ba5d45
Status: Downloaded newer image for ghcr.io/supabase/edge-runtime:v1.74.2
ghcr.io/supabase/edge-runtime:v1.74.2
Finished [36msupabase db push[39m.
```
