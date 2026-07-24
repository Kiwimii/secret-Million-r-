# Supabase-Datenbank-Deployment

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T04:12:08Z
- Commit: a1239016960062dbe5b6259a35e0ee9a94573266
- Secrets geprüft: success
- Projektverknüpfung: success
- Migrationsvorschau: success
- Migration angewendet: failure

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
2026/07/24 04:12:05 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/24 04:12:05 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/24 04:12:05 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=nXuJZNPb7b3ngjQULyYZIfL2"}
2026/07/24 04:12:05 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=nXuJZNPb7b3ngjQULyYZIfL2RUlmRG9LLzdmeUNUZTg1ZGU4ZTYxQWREZFIrSg==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/24 04:12:05 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=nXuJZNPb7b3ngjQULyYZIfL2RUlmRG9LLzdmeUNUZTg1ZGU4ZTYxQWREZFIrSg==,p=caM35bJrYn/N2/quDeBmqiEDNSqoRXnBUgonAkJJUio="}
2026/07/24 04:12:05 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=i+pG7NHEkOigRrpQCo6eUdotPWVaI9MsWur4b5foS2M="}
2026/07/24 04:12:05 PG Recv: {"Type":"AuthenticationOK"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/24 04:12:05 PG Recv: {"Type":"BackendKeyData","ProcessID":89055012,"SecretKey":3463041996}
2026/07/24 04:12:05 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 04:12:05 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/24 04:12:05 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/24 04:12:05 PG Send: {"Type":"Sync"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:05 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/24 04:12:05 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 04:12:05 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 04:12:05 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/24 04:12:05 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:05 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:05 PG Send: {"Type":"Sync"}
2026/07/24 04:12:05 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:05 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724002100"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724010000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724020000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724021000"}]}
2026/07/24 04:12:05 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 11"}
2026/07/24 04:12:05 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Would push these migrations:
 • 20260724022000_add_safe_live_game_cleanup.sql
Finished supabase db push.
2026/07/24 04:12:05 PG Send: {"Type":"Terminate"}
2026/07/24 04:12:05 HTTP POST: https://eu.i.posthog.com/batch/
2026/07/24 04:12:05 HTTP GET: https://api.github.com/repos/supabase/cli/releases/latest
--- supabase-apply.log ---
2026/07/24 04:12:06 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 04:12:06 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/24 04:12:06 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/24 04:12:06 PG Send: {"Type":"Sync"}
2026/07/24 04:12:06 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:06 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/24 04:12:06 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 04:12:06 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 04:12:06 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/24 04:12:06 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:06 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:06 PG Send: {"Type":"Sync"}
2026/07/24 04:12:06 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:06 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724002100"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724010000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724020000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724021000"}]}
2026/07/24 04:12:06 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 11"}
2026/07/24 04:12:06 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Do you want to push these migrations to the remote database?
 • 20260724022000_add_safe_live_game_cleanup.sql

 [Y/n] 
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"SET lock_timeout = '4s'","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"CREATE SCHEMA IF NOT EXISTS supabase_migrations","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text NOT NULL PRIMARY KEY)","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS statements text[]","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS name text","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Sync"}
2026/07/24 04:12:07 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"NoData"}
2026/07/24 04:12:07 PG Recv: {"Type":"CommandComplete","CommandTag":"SET"}
2026/07/24 04:12:07 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"NoData"}
2026/07/24 04:12:07 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42P06","Message":"schema \"supabase_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"schemacmds.c","Line":132,"Routine":"CreateSchemaCommand","UnknownFields":null}
2026/07/24 04:12:07 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE SCHEMA"}
2026/07/24 04:12:07 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"NoData"}
2026/07/24 04:12:07 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42P07","Message":"relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"parse_utilcmd.c","Line":207,"Routine":"transformCreateStmt","UnknownFields":null}
2026/07/24 04:12:07 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE TABLE"}
2026/07/24 04:12:07 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"NoData"}
2026/07/24 04:12:07 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42701","Message":"column \"statements\" of relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"tablecmds.c","Line":7471,"Routine":"check_for_column_name_collision","UnknownFields":null}
2026/07/24 04:12:07 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/24 04:12:07 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"NoData"}
2026/07/24 04:12:07 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42701","Message":"column \"name\" of relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"tablecmds.c","Line":7471,"Routine":"check_for_column_name_collision","UnknownFields":null}
2026/07/24 04:12:07 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/24 04:12:07 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Applying migration 20260724022000_add_safe_live_game_cleanup.sql...
2026/07/24 04:12:07 PG Send: {"Type":"Query","String":"RESET ALL"}
2026/07/24 04:12:07 PG Recv: {"Type":"CommandComplete","CommandTag":"RESET"}
2026/07/24 04:12:07 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"-- Entfernt ausschließlich künstliche Release-Testpartien aus früheren Smoke-Tests.\ndelete from public.games\nwhere title like 'Automatischer Live-Test %'\n   or title like 'Release-Smoke-Test %'","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"-- Eine Spielleitung darf ausschließlich ihre eigene Partie löschen. Die Funktion\n-- wird als Security Definer ausgeführt, damit dafür keine allgemeinen DELETE-\n-- Rechte auf der Tabelle games freigegeben werden müssen.\ncreate or replace function public.delete_own_live_game(target_game_id uuid)\nreturns void\nlanguage plpgsql\nsecurity definer\nset search_path = public\nas $$\nbegin\n  if auth.uid() is null then\n    raise exception 'Gerätesitzung fehlt.' using errcode = '42501';\n  end if;\n\n  delete from public.games g\n  where g.id = target_game_id\n    and g.host_user_id = auth.uid();\n\n  if not found then\n    raise exception 'Die Partie wurde nicht gefunden oder gehört nicht zu dieser Spielleitung.' using errcode = '42501';\n  end if;\nend;\n$$","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"revoke all on function public.delete_own_live_game(uuid) from public","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"grant execute on function public.delete_own_live_game(uuid) to authenticated","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"comment on function public.delete_own_live_game(uuid) is\n  'Löscht ausschließlich eine Partie, deren aktuelle Spielleitung dem angemeldeten Gerät gehört.'","ParameterOIDs":null}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Parse","Name":"","Query":"INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1, $2, $3)","ParameterOIDs":[25,25,1009]}
2026/07/24 04:12:07 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":[0,0,1],"Parameters":[{"text":"20260724022000"},{"text":"add_safe_live_game_cleanup"},{"binary":"0000000100000000000000190000000500000001000000c42d2d20456e746665726e74206175737363686c6965c39f6c696368206bc3bc6e73746c696368652052656c656173652d546573747061727469656e20617573206672c3bc686572656e20536d6f6b652d54657374732e0a64656c6574652066726f6d207075626c69632e67616d65730a7768657265207469746c65206c696b6520274175746f6d6174697363686572204c6976652d546573742025270a2020206f72207469746c65206c696b65202752656c656173652d536d6f6b652d54657374202527000002ee2d2d2045696e6520537069656c6c656974756e672064617266206175737363686c6965c39f6c696368206968726520656967656e6520506172746965206cc3b6736368656e2e204469652046756e6b74696f6e0a2d2d207769726420616c7320536563757269747920446566696e657220617573676566c3bc6872742c2064616d697420646166c3bc72206b65696e6520616c6c67656d65696e656e2044454c4554452d0a2d2d20526563687465206175662064657220546162656c6c652067616d657320667265696765676562656e2077657264656e206dc3bc7373656e2e0a637265617465206f72207265706c6163652066756e6374696f6e207075626c69632e64656c6574655f6f776e5f6c6976655f67616d65287461726765745f67616d655f69642075756964290a72657475726e7320766f69640a6c616e677561676520706c706773716c0a736563757269747920646566696e65720a736574207365617263685f70617468203d207075626c69630a61732024240a626567696e0a2020696620617574682e7569642829206973206e756c6c207468656e0a20202020726169736520657863657074696f6e2027476572c3a474657369747a756e67206665686c742e27207573696e6720657272636f6465203d20273432353031273b0a2020656e642069663b0a0a202064656c6574652066726f6d207075626c69632e67616d657320670a2020776865726520672e6964203d207461726765745f67616d655f69640a20202020616e6420672e686f73745f757365725f6964203d20617574682e75696428293b0a0a20206966206e6f7420666f756e64207468656e0a20202020726169736520657863657074696f6e202744696520506172746965207775726465206e6963687420676566756e64656e206f64657220676568c3b67274206e69636874207a752064696573657220537069656c6c656974756e672e27207573696e6720657272636f6465203d20273432353031273b0a2020656e642069663b0a656e643b0a2424000000447265766f6b6520616c6c206f6e2066756e6374696f6e207075626c69632e64656c6574655f6f776e5f6c6976655f67616d652875756964292066726f6d207075626c69630000004c6772616e742065786563757465206f6e2066756e6374696f6e207075626c69632e64656c6574655f6f776e5f6c6976655f67616d6528757569642920746f2061757468656e746963617465640000009e636f6d6d656e74206f6e2066756e6374696f6e207075626c69632e64656c6574655f6f776e5f6c6976655f67616d652875756964292069730a2020274cc3b673636874206175737363686c6965c39f6c6963682065696e65205061727469652c20646572656e20616b7475656c6c6520537069656c6c656974756e672064656d20616e67656d656c646574656e20476572c3a47420676568c3b672742e27"}],"ResultFormatCodes":[]}
2026/07/24 04:12:07 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 04:12:07 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 04:12:07 PG Send: {"Type":"Sync"}
2026/07/24 04:12:07 PG Recv: {"Type":"ParseComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"BindComplete"}
2026/07/24 04:12:07 PG Recv: {"Type":"NoData"}
2026/07/24 04:12:07 PG Recv: {"Type":"ErrorResponse","Severity":"ERROR","SeverityUnlocalized":"ERROR","Code":"23503","Message":"insert or update on table \"live_game_updates\" violates foreign key constraint \"live_game_updates_game_id_fkey\"","Detail":"Key (game_id)=(d66b683d-93a1-4e93-85cf-4807cf279f4c) is not present in table \"games\".","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"SQL statement \"insert into public.live_game_updates (game_id, update_type)\n    values (resolved_game_id, tg_table_name)\"\nPL/pgSQL function emit_live_game_refresh() line 19 at SQL statement","SchemaName":"public","TableName":"live_game_updates","ColumnName":"","DataTypeName":"","ConstraintName":"live_game_updates_game_id_fkey","File":"ri_triggers.c","Line":2599,"Routine":"ri_ReportViolation","UnknownFields":null}
2026/07/24 04:12:07 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 04:12:07 PG Send: {"Type":"Terminate"}
2026/07/24 04:12:07 HTTP POST: https://eu.i.posthog.com/batch/
ERROR: insert or update on table "live_game_updates" violates foreign key constraint "live_game_updates_game_id_fkey" (SQLSTATE 23503)
Key (game_id)=(d66b683d-93a1-4e93-85cf-4807cf279f4c) is not present in table "games".                                                 
At statement: 0                                                                                                                       
-- Entfernt ausschließlich künstliche Release-Testpartien aus früheren Smoke-Tests.                                                   
delete from public.games                                                                                                              
where title like 'Automatischer Live-Test %'                                                                                          
   or title like 'Release-Smoke-Test %'                                                                                               
```
