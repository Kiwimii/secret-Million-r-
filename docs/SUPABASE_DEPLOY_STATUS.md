# Supabase-Datenbank-Deployment

- Status: fehlgeschlagen
- Zeitpunkt (UTC): 2026-07-23T23:04:47Z
- Commit: dd8b8fc6275c02565d1563ed477172a79fc685b8
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
2026/07/23 23:04:42 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/23 23:04:42 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/23 23:04:42 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=swAbswyoajLbYTXZxn1eHIVl"}
2026/07/23 23:04:42 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=swAbswyoajLbYTXZxn1eHIVlRU5wTjdaSkxtak43WkFhQW8ralY1OVZBQnRmRw==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/23 23:04:42 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=swAbswyoajLbYTXZxn1eHIVlRU5wTjdaSkxtak43WkFhQW8ralY1OVZBQnRmRw==,p=MiP4xu0hDHoYL6eA+rN1GfEXoOKAyYWEqwbThyUrHyc="}
2026/07/23 23:04:42 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=wneOi8EHjAmoIFVIg2iG9n4SrBfe9UH5HegpMdMldbg="}
2026/07/23 23:04:42 PG Recv: {"Type":"AuthenticationOK"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/23 23:04:42 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/23 23:04:42 PG Recv: {"Type":"BackendKeyData","ProcessID":83004372,"SecretKey":4082591821}
2026/07/23 23:04:42 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/23 23:04:42 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/23 23:04:42 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/23 23:04:42 PG Send: {"Type":"Sync"}
2026/07/23 23:04:43 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:43 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/23 23:04:43 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/23 23:04:43 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/23 23:04:43 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/23 23:04:43 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/23 23:04:43 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/23 23:04:43 PG Send: {"Type":"Sync"}
2026/07/23 23:04:43 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:43 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/23 23:04:43 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/23 23:04:43 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/23 23:04:43 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/23 23:04:43 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/23 23:04:43 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/23 23:04:43 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 5"}
2026/07/23 23:04:43 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Would push these migrations:
 • 20260724000000_live_game_instances.sql
 • 20260724001000_live_game_repairs.sql
Finished supabase db push.
2026/07/23 23:04:43 PG Send: {"Type":"Terminate"}
2026/07/23 23:04:43 HTTP POST: https://eu.i.posthog.com/batch/
2026/07/23 23:04:43 HTTP GET: https://api.github.com/repos/supabase/cli/releases/latest
--- supabase-apply.log ---
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE INDEX"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"ALTER TABLE"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"00000","Message":"policy \"round_mission_host_all\" for relation \"public.round_mission_selections\" does not exist, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"dropcmds.c","Line":523,"Routine":"does_not_exist_skipping","UnknownFields":null}
NOTICE (00000): policy "round_mission_host_all" for relation "public.round_mission_selections" does not exist, skipping
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"DROP POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"00000","Message":"policy \"round_mission_assignee_read\" for relation \"public.round_mission_selections\" does not exist, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"dropcmds.c","Line":523,"Routine":"does_not_exist_skipping","UnknownFields":null}
NOTICE (00000): policy "round_mission_assignee_read" for relation "public.round_mission_selections" does not exist, skipping
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"DROP POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"00000","Message":"policy \"player_progress_host_read\" for relation \"public.player_progress\" does not exist, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"dropcmds.c","Line":523,"Routine":"does_not_exist_skipping","UnknownFields":null}
NOTICE (00000): policy "player_progress_host_read" for relation "public.player_progress" does not exist, skipping
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"DROP POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"00000","Message":"policy \"player_progress_member_own\" for relation \"public.player_progress\" does not exist, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"dropcmds.c","Line":523,"Routine":"does_not_exist_skipping","UnknownFields":null}
NOTICE (00000): policy "player_progress_member_own" for relation "public.player_progress" does not exist, skipping
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"DROP POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Severity":"NOTICE","SeverityUnlocalized":"NOTICE","Code":"00000","Message":"policy \"live_updates_participant_read\" for relation \"public.live_game_updates\" does not exist, skipping","Detail":"","Hint":"","Position":0,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"dropcmds.c","Line":523,"Routine":"does_not_exist_skipping","UnknownFields":null}
NOTICE (00000): policy "live_updates_participant_read" for relation "public.live_game_updates" does not exist, skipping
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"DROP POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE POLICY"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE FUNCTION"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE FUNCTION"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE FUNCTION"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE FUNCTION"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE FUNCTION"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE FUNCTION"}
2026/07/23 23:04:45 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:04:45 PG Recv: {"Type":"NoData"}
2026/07/23 23:04:45 PG Recv: {"Type":"CommandComplete","CommandTag":"CREATE FUNCTION"}
2026/07/23 23:04:45 PG Recv: {"Type":"ErrorResponse","Severity":"ERROR","SeverityUnlocalized":"ERROR","Code":"42601","Message":"syntax error at or near \"current_role\"","Detail":"","Hint":"","Position":572,"InternalPosition":0,"InternalQuery":"","Where":"","SchemaName":"","TableName":"","ColumnName":"","DataTypeName":"","ConstraintName":"","File":"scan.l","Line":1244,"Routine":"scanner_yyerror","UnknownFields":null}
2026/07/23 23:04:45 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/23 23:04:45 PG Send: {"Type":"Terminate"}
2026/07/23 23:04:45 HTTP POST: https://eu.i.posthog.com/batch/
ERROR: syntax error at or near "current_role" (SQLSTATE 42601)                 
At statement: 27                                                               
create or replace function public.get_host_player_progress(target_game_id uuid)
returns table (                                                                
  member_id uuid,                                                              
  display_name citext,                                                         
  avatar_path text,                                                            
  attendance_status public.attendance_status,                                  
  winner_pool_status public.winner_pool_status,                                
  challenge_team public.challenge_team_code,                                   
  screen_key text,                                                             
  step_key text,                                                               
  phase_seen public.game_phase,                                                
  role_revealed boolean,                                                       
  mission_opened boolean,                                                      
  advantage_opened boolean,                                                    
  challenge_briefing_opened boolean,                                           
  vote_submitted boolean,                                                      
  role_decision_submitted boolean,                                             
  last_seen_at timestamptz,                                                    
  current_role public.game_role                                                
  ^                                                                            
```
