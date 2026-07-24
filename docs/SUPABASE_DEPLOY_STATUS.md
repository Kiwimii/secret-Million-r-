# Supabase-Datenbank-Deployment

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-24T14:24:57Z
- Commit: 60ed51c2be4c3b6b78be202dba21004cbc1e9eb7
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
2026/07/24 14:24:54 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/24 14:24:54 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/24 14:24:54 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=S903irQRB5CWWHCAnHbl+uAQ"}
2026/07/24 14:24:54 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=S903irQRB5CWWHCAnHbl+uAQRURhRy9SUy9NOUIzL2w1QW5TTWhDNkJTZUFTRw==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/24 14:24:54 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=S903irQRB5CWWHCAnHbl+uAQRURhRy9SUy9NOUIzL2w1QW5TTWhDNkJTZUFTRw==,p=+0ySZRJP3oVkbzOBq3dFQNb1Ww8LThPr2kTU+kGUJe0="}
2026/07/24 14:24:54 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=6ViZJ+Nf2x4sbKdsUuQ/7DyW+wa9uquqw0/pG+GTNaM="}
2026/07/24 14:24:54 PG Recv: {"Type":"AuthenticationOK"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/24 14:24:54 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/24 14:24:54 PG Recv: {"Type":"BackendKeyData","ProcessID":102860316,"SecretKey":797016014}
2026/07/24 14:24:54 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 14:24:54 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/24 14:24:54 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/24 14:24:54 PG Send: {"Type":"Sync"}
2026/07/24 14:24:55 PG Recv: {"Type":"ParseComplete"}
2026/07/24 14:24:55 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/24 14:24:55 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 14:24:55 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 14:24:55 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/24 14:24:55 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:55 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:55 PG Send: {"Type":"Sync"}
2026/07/24 14:24:55 PG Recv: {"Type":"BindComplete"}
2026/07/24 14:24:55 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724002100"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724010000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724020000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724021000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724022000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724023000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724024000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724113000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724124500"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140500"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724141000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724143000"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144500"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144600"}]}
2026/07/24 14:24:55 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 22"}
2026/07/24 14:24:55 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Would push these migrations:
 • 20260724150000_host_round_packages_rpc.sql
Finished supabase db push.
2026/07/24 14:24:55 PG Send: {"Type":"Terminate"}
2026/07/24 14:24:55 HTTP POST: https://eu.i.posthog.com/batch/
2026/07/24 14:24:55 HTTP GET: https://api.github.com/repos/supabase/cli/releases/latest
--- supabase-apply.log ---
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724023000"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724024000"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724113000"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724124500"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140000"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140500"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724141000"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724143000"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144500"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144600"}]}
2026/07/24 14:24:56 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 22"}
2026/07/24 14:24:56 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Do you want to push these migrations to the remote database?
 • 20260724150000_host_round_packages_rpc.sql

 [Y/n] 
2026/07/24 14:24:56 PG Send: {"Type":"Parse","Name":"","Query":"SET lock_timeout = '4s'","ParameterOIDs":null}
2026/07/24 14:24:56 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:56 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:56 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:56 PG Send: {"Type":"Parse","Name":"","Query":"CREATE SCHEMA IF NOT EXISTS supabase_migrations","ParameterOIDs":null}
2026/07/24 14:24:56 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:56 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:56 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:56 PG Send: {"Type":"Parse","Name":"","Query":"CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text NOT NULL PRIMARY KEY)","ParameterOIDs":null}
2026/07/24 14:24:56 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:56 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:56 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:56 PG Send: {"Type":"Parse","Name":"","Query":"ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS statements text[]","ParameterOIDs":null}
2026/07/24 14:24:56 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:56 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:56 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:56 PG Send: {"Type":"Parse","Name":"","Query":"ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS name text","ParameterOIDs":null}
2026/07/24 14:24:56 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:56 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:56 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:56 PG Send: {"Type":"Sync"}
2026/07/24 14:24:56 PG Recv: {"Type":"ParseComplete"}
2026/07/24 14:24:56 PG Recv: {"Type":"BindComplete"}
2026/07/24 14:24:56 PG Recv: {"Type":"NoData"}
2026/07/24 14:24:56 PG Recv: {"Type":"CommandComplete","CommandTag":"SET"}
2026/07/24 14:24:56 PG Recv: {"Type":"ParseComplete"}
2026/07/24 14:24:56 PG Recv: {"Type":"BindComplete"}
2026/07/24 14:24:56 PG Recv: {"Type":"NoData"}
2026/07/24 14:24:56 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42P06","Message":"schema \"supabase_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"schemacmds.c","Line":132,"Routine":"CreateSchemaCommand","UnknownFields":null}
2026/07/24 14:24:57 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE SCHEMA"}
2026/07/24 14:24:57 PG Recv: {"Type":"ParseComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"BindComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"NoData"}
2026/07/24 14:24:57 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42P07","Message":"relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"parse_utilcmd.c","Line":207,"Routine":"transformCreateStmt","UnknownFields":null}
2026/07/24 14:24:57 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE TABLE"}
2026/07/24 14:24:57 PG Recv: {"Type":"ParseComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"BindComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"NoData"}
2026/07/24 14:24:57 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42701","Message":"column \"statements\" of relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"tablecmds.c","Line":7471,"Routine":"check_for_column_name_collision","UnknownFields":null}
2026/07/24 14:24:57 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/24 14:24:57 PG Recv: {"Type":"ParseComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"BindComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"NoData"}
2026/07/24 14:24:57 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42701","Message":"column \"name\" of relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"tablecmds.c","Line":7471,"Routine":"check_for_column_name_collision","UnknownFields":null}
2026/07/24 14:24:57 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/24 14:24:57 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Applying migration 20260724150000_host_round_packages_rpc.sql...
2026/07/24 14:24:57 PG Send: {"Type":"Query","String":"RESET ALL"}
2026/07/24 14:24:57 PG Recv: {"Type":"CommandComplete","CommandTag":"RESET"}
2026/07/24 14:24:57 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 14:24:57 PG Send: {"Type":"Parse","Name":"","Query":"-- Lädt Andrés Missions- und Vorteilsfestlegungen ohne direkten Tabellenzugriff aus dem Browser.\ncreate or replace function public.get_live_host_round_packages(target_game_id uuid)\nreturns table (\n  round_number smallint,\n  mission_catalog_id text,\n  advantage_catalog_id text\n)\nlanguage plpgsql\nstable\nsecurity definer\nset search_path = public, extensions, pg_temp\nas $$\nbegin\n  if not public.is_game_host(target_game_id) then\n    raise exception 'Nur André darf die geheimen Rundenpakete sehen.' using errcode = '42501';\n  end if;\n\n  return query\n  select\n    rounds.round_number,\n    mission.catalog_id,\n    advantage.catalog_id\n  from generate_series(1, 4)::smallint as rounds(round_number)\n  left join public.round_mission_selections mission\n    on mission.game_id = target_game_id\n   and mission.round_number = rounds.round_number\n  left join public.round_advantage_selections advantage\n    on advantage.game_id = target_game_id\n   and advantage.round_number = rounds.round_number\n  order by rounds.round_number;\nend;\n$$","ParameterOIDs":null}
2026/07/24 14:24:57 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:57 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:57 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:57 PG Send: {"Type":"Parse","Name":"","Query":"revoke all on function public.get_live_host_round_packages(uuid) from public","ParameterOIDs":null}
2026/07/24 14:24:57 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:57 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:57 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:57 PG Send: {"Type":"Parse","Name":"","Query":"grant execute on function public.get_live_host_round_packages(uuid) to authenticated","ParameterOIDs":null}
2026/07/24 14:24:57 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:57 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:57 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:57 PG Send: {"Type":"Parse","Name":"","Query":"comment on function public.get_live_host_round_packages(uuid) is\n  'Host-only RPC für Missions- und Vorteilsfestlegungen; verhindert direkten Browserzugriff auf geheime Tabellen.'","ParameterOIDs":null}
2026/07/24 14:24:57 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/24 14:24:57 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:57 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:57 PG Send: {"Type":"Parse","Name":"","Query":"INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1, $2, $3)","ParameterOIDs":[25,25,1009]}
2026/07/24 14:24:57 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":[0,0,1],"Parameters":[{"text":"20260724150000"},{"text":"host_round_packages_rpc"},{"binary":"0000000100000000000000190000000400000001000004052d2d204cc3a4647420416e6472c3a973204d697373696f6e732d20756e6420566f727465696c73666573746c6567756e67656e206f686e6520646972656b74656e20546162656c6c656e7a756772696666206175732064656d2042726f777365722e0a637265617465206f72207265706c6163652066756e6374696f6e207075626c69632e6765745f6c6976655f686f73745f726f756e645f7061636b61676573287461726765745f67616d655f69642075756964290a72657475726e73207461626c6520280a2020726f756e645f6e756d62657220736d616c6c696e742c0a20206d697373696f6e5f636174616c6f675f696420746578742c0a2020616476616e746167655f636174616c6f675f696420746578740a290a6c616e677561676520706c706773716c0a737461626c650a736563757269747920646566696e65720a736574207365617263685f70617468203d207075626c69632c20657874656e73696f6e732c2070675f74656d700a61732024240a626567696e0a20206966206e6f74207075626c69632e69735f67616d655f686f7374287461726765745f67616d655f696429207468656e0a20202020726169736520657863657074696f6e20274e757220416e6472c3a92064617266206469652067656865696d656e2052756e64656e70616b65746520736568656e2e27207573696e6720657272636f6465203d20273432353031273b0a2020656e642069663b0a0a202072657475726e2071756572790a202073656c6563740a20202020726f756e64732e726f756e645f6e756d6265722c0a202020206d697373696f6e2e636174616c6f675f69642c0a20202020616476616e746167652e636174616c6f675f69640a202066726f6d2067656e65726174655f73657269657328312c2034293a3a736d616c6c696e7420617320726f756e647328726f756e645f6e756d626572290a20206c656674206a6f696e207075626c69632e726f756e645f6d697373696f6e5f73656c656374696f6e73206d697373696f6e0a202020206f6e206d697373696f6e2e67616d655f6964203d207461726765745f67616d655f69640a202020616e64206d697373696f6e2e726f756e645f6e756d626572203d20726f756e64732e726f756e645f6e756d6265720a20206c656674206a6f696e207075626c69632e726f756e645f616476616e746167655f73656c656374696f6e7320616476616e746167650a202020206f6e20616476616e746167652e67616d655f6964203d207461726765745f67616d655f69640a202020616e6420616476616e746167652e726f756e645f6e756d626572203d20726f756e64732e726f756e645f6e756d6265720a20206f7264657220627920726f756e64732e726f756e645f6e756d6265723b0a656e643b0a24240000004c7265766f6b6520616c6c206f6e2066756e6374696f6e207075626c69632e6765745f6c6976655f686f73745f726f756e645f7061636b616765732875756964292066726f6d207075626c6963000000546772616e742065786563757465206f6e2066756e6374696f6e207075626c69632e6765745f6c6976655f686f73745f726f756e645f7061636b6167657328757569642920746f2061757468656e74696361746564000000b4636f6d6d656e74206f6e2066756e6374696f6e207075626c69632e6765745f6c6976655f686f73745f726f756e645f7061636b616765732875756964292069730a202027486f73742d6f6e6c79205250432066c3bc72204d697373696f6e732d20756e6420566f727465696c73666573746c6567756e67656e3b2076657268696e6465727420646972656b74656e2042726f777365727a756772696666206175662067656865696d6520546162656c6c656e2e27"}],"ResultFormatCodes":[]}
2026/07/24 14:24:57 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 14:24:57 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 14:24:57 PG Send: {"Type":"Sync"}
2026/07/24 14:24:57 PG Recv: {"Type":"ParseComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"BindComplete"}
2026/07/24 14:24:57 PG Recv: {"Type":"NoData"}
2026/07/24 14:24:57 PG Recv: {"Type":"ErrorResponse","Severity":"ERROR","SeverityUnlocalized":"ERROR","Code":"42601","Message":"syntax error at or near \"::\"","Detail":"","Hint":"","Position":661,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"scan.l","Line":1244,"Routine":"scanner_yyerror","UnknownFields":null}
2026/07/24 14:24:57 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 14:24:57 PG Send: {"Type":"Terminate"}
2026/07/24 14:24:57 HTTP POST: https://eu.i.posthog.com/batch/
ERROR: syntax error at or near "::" (SQLSTATE 42601)                                            
At statement: 0                                                                                 
-- Lädt Andrés Missions- und Vorteilsfestlegungen ohne direkten Tabellenzugriff aus dem Browser.
create or replace function public.get_live_host_round_packages(target_game_id uuid)             
returns table (                                                                                 
  round_number smallint,                                                                        
  mission_catalog_id text,                                                                      
  advantage_catalog_id text                                                                     
)                                                                                               
language plpgsql                                                                                
stable                                                                                          
security definer                                                                                
set search_path = public, extensions, pg_temp                                                   
as $$                                                                                           
begin                                                                                           
  if not public.is_game_host(target_game_id) then                                               
    raise exception 'Nur André darf die geheimen Rundenpakete sehen.' using errcode = '42501';  
  end if;                                                                                       
                                                                                                
  return query                                                                                  
  select                                                                                        
    rounds.round_number,                                                                        
    mission.catalog_id,                                                                         
    advantage.catalog_id                                                                        
  from generate_series(1, 4)::smallint as rounds(round_number)                                  
                         ^                                                                      
```
