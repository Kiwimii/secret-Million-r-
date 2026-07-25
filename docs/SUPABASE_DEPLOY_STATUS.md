# Supabase-Datenbank-Deployment

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-25T05:20:23Z
- Commit: e4741f6d562d50aa9cacb0f7b2932820cfe750bf
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
2026/07/25 05:20:20 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/25 05:20:20 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/25 05:20:20 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=xcUsf1QMPmLbd8m+pf0vlgP/"}
2026/07/25 05:20:20 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=xcUsf1QMPmLbd8m+pf0vlgP/RUcyY2FaLzY1VkpvSldmemI0a3RTcXBGaEZjRQ==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/25 05:20:20 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=xcUsf1QMPmLbd8m+pf0vlgP/RUcyY2FaLzY1VkpvSldmemI0a3RTcXBGaEZjRQ==,p=VbpuBB2OXKFRE9+VR2Z9CUDhvxRg1CcF9Tslmpq7xL4="}
2026/07/25 05:20:20 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=5wWINqLMtVAP8ICN+xndWrKPstzXMR35+jofrmIgPcg="}
2026/07/25 05:20:20 PG Recv: {"Type":"AuthenticationOK"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/25 05:20:20 PG Recv: {"Type":"BackendKeyData","ProcessID":77125758,"SecretKey":533865521}
2026/07/25 05:20:20 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/25 05:20:20 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/25 05:20:20 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/25 05:20:20 PG Send: {"Type":"Sync"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:20 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/25 05:20:20 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/25 05:20:20 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/25 05:20:20 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/25 05:20:20 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:20 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:20 PG Send: {"Type":"Sync"}
2026/07/25 05:20:20 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:20 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724002100"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724010000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724020000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724021000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724022000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724023000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724024000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724113000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724124500"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140500"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724141000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724143000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144500"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144600"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724150000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724150100"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724151000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724152000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724153000"}]}
2026/07/25 05:20:20 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 27"}
2026/07/25 05:20:20 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Would push these migrations:
 • 20260724153000_restore_join_resume_execute.sql
 • 20260724153100_fix_reroll_rejected_ids.sql
Finished supabase db push.
2026/07/25 05:20:20 PG Send: {"Type":"Terminate"}
2026/07/25 05:20:20 HTTP POST: https://eu.i.posthog.com/batch/
2026/07/25 05:20:21 HTTP GET: https://api.github.com/repos/supabase/cli/releases/latest
--- supabase-apply.log ---
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Sync"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724002100"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724010000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724020000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724021000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724022000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724023000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724024000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724113000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724124500"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724140500"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724141000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724143000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144500"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724144600"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724150000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724150100"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724151000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724152000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724153000"}]}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 27"}
2026/07/25 05:20:22 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Do you want to push these migrations to the remote database?
 • 20260724153000_restore_join_resume_execute.sql
 • 20260724153100_fix_reroll_rejected_ids.sql

 [Y/n] 
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"SET lock_timeout = '4s'","ParameterOIDs":null}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"CREATE SCHEMA IF NOT EXISTS supabase_migrations","ParameterOIDs":null}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text NOT NULL PRIMARY KEY)","ParameterOIDs":null}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS statements text[]","ParameterOIDs":null}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"ALTER TABLE supabase_migrations.schema_migrations ADD COLUMN IF NOT EXISTS name text","ParameterOIDs":null}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Sync"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"SET"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42P06","Message":"schema \"supabase_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"schemacmds.c","Line":132,"Routine":"CreateSchemaCommand","UnknownFields":null}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE SCHEMA"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42P07","Message":"relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"parse_utilcmd.c","Line":207,"Routine":"transformCreateStmt","UnknownFields":null}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE TABLE"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42701","Message":"column \"statements\" of relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"tablecmds.c","Line":7471,"Routine":"check_for_column_name_collision","UnknownFields":null}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"42701","Message":"column \"name\" of relation \"schema_migrations\" already exists, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"tablecmds.c","Line":7471,"Routine":"check_for_column_name_collision","UnknownFields":null}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/25 05:20:22 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Applying migration 20260724153000_restore_join_resume_execute.sql...
2026/07/25 05:20:22 PG Send: {"Type":"Query","String":"RESET ALL"}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"RESET"}
2026/07/25 05:20:22 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"-- Minimaler Produktionshotfix: stellt ausschließlich das Ausführungsrecht der\n-- bestehenden Beitritts-/Wiedereintrittsfunktion für authentifizierte anonyme\n-- Gerätesitzungen wieder her. Keine Tabellen, Daten oder Spielmechaniken ändern sich.\n\ngrant execute on function public.join_or_resume_live_game(text, text, text, text) to authenticated","ParameterOIDs":null}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"comment on function public.join_or_resume_live_game(text, text, text, text) is\n  'Erstellt oder übernimmt ein Spielerprofil für eine authentifizierte anonyme Gerätesitzung.'","ParameterOIDs":null}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Parse","Name":"","Query":"INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1, $2, $3)","ParameterOIDs":[25,25,1009]}
2026/07/25 05:20:22 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"","ParameterFormatCodes":[0,0,1],"Parameters":[{"text":"20260724153000"},{"text":"restore_join_resume_execute"},{"binary":"00000001000000000000001900000002000000010000015d2d2d204d696e696d616c65722050726f64756b74696f6e73686f746669783a207374656c6c74206175737363686c6965c39f6c696368206461732041757366c3bc6872756e67737265636874206465720a2d2d20626573746568656e64656e204265697472697474732d2f57696564657265696e74726974747366756e6b74696f6e2066c3bc722061757468656e746966697a696572746520616e6f6e796d650a2d2d20476572c3a474657369747a756e67656e20776965646572206865722e204b65696e6520546162656c6c656e2c20446174656e206f64657220537069656c6d656368616e696b656e20c3a46e6465726e20736963682e0a0a6772616e742065786563757465206f6e2066756e6374696f6e207075626c69632e6a6f696e5f6f725f726573756d655f6c6976655f67616d6528746578742c20746578742c20746578742c20746578742920746f2061757468656e74696361746564000000b0636f6d6d656e74206f6e2066756e6374696f6e207075626c69632e6a6f696e5f6f725f726573756d655f6c6976655f67616d6528746578742c20746578742c20746578742c2074657874292069730a20202745727374656c6c74206f64657220c3bc6265726e696d6d742065696e20537069656c657270726f66696c2066c3bc722065696e652061757468656e746966697a696572746520616e6f6e796d6520476572c3a474657369747a756e672e27"}],"ResultFormatCodes":[]}
2026/07/25 05:20:22 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/25 05:20:22 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/25 05:20:22 PG Send: {"Type":"Sync"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"GRANT"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Type":"CommandComplete","CommandTag":"COMMENT"}
2026/07/25 05:20:22 PG Recv: {"Type":"ParseComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"BindComplete"}
2026/07/25 05:20:22 PG Recv: {"Type":"NoData"}
2026/07/25 05:20:22 PG Recv: {"Type":"ErrorResponse","Severity":"ERROR","SeverityUnlocalized":"ERROR","Code":"23505","Message":"duplicate key value violates unique constraint \"schema_migrations_pkey\"","Detail":"Key (version)=(20260724153000) already exists.","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"supabase_migrations","TableName":"schema_migrations","ColumnName":"","DataTypeName":"","ConstraintName":"schema_migrations_pkey","File":"nbtinsert.c","Line":666,"Routine":"_bt_check_unique","UnknownFields":null}
2026/07/25 05:20:22 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/25 05:20:22 PG Send: {"Type":"Terminate"}
2026/07/25 05:20:22 HTTP POST: https://eu.i.posthog.com/batch/
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20260724153000) already exists.                                                 
At statement: 2                                                                                
INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1, $2, $3)
```
