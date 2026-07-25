# Supabase-Datenbank-Deployment

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-25T19:02:40Z
- Commit: e48f30b5b04547c477853dc6f5a1a53c3ffe27cb
- Secrets geprüft: success
- Projektverknüpfung: success
- Migrationsvorschau: failure
- Migration angewendet: skipped

## Letzte Diagnosezeilen
```text
--- supabase-link.log ---
Finished supabase link.
--- supabase-preview.log ---
open /home/runner/.supabase/profile: no such file or directory
Loading project ref from env var: wxagegieaaqxuzwobgtc
Using connection pooler: postgresql://postgres.wxagegieaaqxuzwobgtc@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
Using database password *** env var...
Supabase CLI 2.109.1
Using profile: supabase (supabase.co)
DRY RUN: migrations will *not* be pushed to the database.
Connecting to remote database...
2026/07/25 19:02:39 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/25 19:02:39 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/25 19:02:39 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=l1RzcuSP6aW03pnH/CgWCPDR"}
2026/07/25 19:02:39 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=l1RzcuSP6aW03pnH/CgWCPDRRUFNVFA0T3p0Z2tTRkovN1JOWE5SMGhQMnlMTA==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/25 19:02:39 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=l1RzcuSP6aW03pnH/CgWCPDRRUFNVFA0T3p0Z2tTRkovN1JOWE5SMGhQMnlMTA==,p=6mb4/2fbpSnX8JvUWrrbug5zxglNXqn0d7S9ow8oFSo="}
2026/07/25 19:02:39 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=Ijw6s7W9SktlYzXIKF96zxLuCepCdm6cpkNj8+1XlE4="}
2026/07/25 19:02:39 PG Recv: {"Type":"AuthenticationOK"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/25 19:02:39 PG Recv: {"Type":"BackendKeyData","ProcessID":132285020,"SecretKey":3170255946}
2026/07/25 19:02:39 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/25 19:02:39 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/25 19:02:39 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/25 19:02:39 PG Send: {"Type":"Sync"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParseComplete"}
2026/07/25 19:02:39 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/25 19:02:39 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/25 19:02:39 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/25 19:02:39 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/25 19:02:39 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 19:02:40 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 19:02:40 PG Send: {"Type":"Sync"}
2026/07/25 19:02:40 PG Recv: {"Type":"BindComplete"}
2026/07/25 19:02:40 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724002100"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724010000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724020000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724021000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724022000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724023000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724024000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724113000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724124500"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140500"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724141000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724143000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144500"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144600"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724150000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724150100"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724151000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724152000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724153000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724154000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724154100"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724155000"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724156100"}]}
2026/07/25 19:02:40 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 31"}
2026/07/25 19:02:40 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/25 19:02:40 PG Send: {"Type":"Terminate"}
2026/07/25 19:02:40 HTTP POST: https://eu.i.posthog.com/batch/
Found local migration files to be inserted before the last migration on remote database.

Rerun the command with --include-all flag to apply these migrations:
supabase/migrations/20260724155000_host_player_manual_recovery.sql

```
