# Supabase-Datenbank-Deployment

- Status: erfolgreich
- Zeitpunkt (UTC): 2026-08-04T23:04:15Z
- Commit: a026a0d9d37621b16e6e78398982f43d8e28dc8c
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
 • [1m20260805010100_meta_game_v2_part1.sql[22m
 • [1m20260805010200_meta_game_v2_view.sql[22m
 • [1m20260805010300_meta_game_v2_round_actions.sql[22m
 • [1m20260805010400_meta_game_v2_votes.sql[22m
 • [1m20260805010500_meta_game_v2_close_voting.sql[22m
 • [1m20260805010600_meta_game_v2_finish.sql[22m
 • [1m20260805010700_meta_game_v2_admin.sql[22m
Finished [36msupabase db push[39m.
--- supabase-apply.log ---
NotFound: FileSystem.readFile (/home/runner/.supabase/profile)
Using database password *** env var...
Connecting to remote database...
Do you want to push these migrations to the remote database?
 • [1m20260805010100_meta_game_v2_part1.sql[22m
 • [1m20260805010200_meta_game_v2_view.sql[22m
 • [1m20260805010300_meta_game_v2_round_actions.sql[22m
 • [1m20260805010400_meta_game_v2_votes.sql[22m
 • [1m20260805010500_meta_game_v2_close_voting.sql[22m
 • [1m20260805010600_meta_game_v2_finish.sql[22m
 • [1m20260805010700_meta_game_v2_admin.sql[22m
 [Y/n] 
Applying migration 20260805010100_meta_game_v2_part1.sql...
Applying migration 20260805010200_meta_game_v2_view.sql...
Applying migration 20260805010300_meta_game_v2_round_actions.sql...
Applying migration 20260805010400_meta_game_v2_votes.sql...
Applying migration 20260805010500_meta_game_v2_close_voting.sql...
Applying migration 20260805010600_meta_game_v2_finish.sql...
Applying migration 20260805010700_meta_game_v2_admin.sql...
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
b9136609bef0: Download complete
bfab333b5e81: Verifying Checksum
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
