# Supabase-Datenbank-Deployment

- Status: erfolgreich
- Zeitpunkt (UTC): 2026-07-23T23:17:55Z
- Commit: 520a15437ba7468fe9e203e3a41ec92aa16b478b
- Projektverknüpfung: success
- Migrationsvorschau: success
- Migration angewendet: success

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
2026/07/23 23:17:52 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/23 23:17:52 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/23 23:17:52 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=wE+zFUBLzKyzPydL3kw/3uY1"}
2026/07/23 23:17:52 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=wE+zFUBLzKyzPydL3kw/3uY1RUR1Nm9sOFpKZHBObGE2WWZXWitoQzAvd0VXSg==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/23 23:17:52 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=wE+zFUBLzKyzPydL3kw/3uY1RUR1Nm9sOFpKZHBObGE2WWZXWitoQzAvd0VXSg==,p=XVa85ESMHKTZ1JvC4YzYFPifIacv+sI/G1u8jzegsX4="}
2026/07/23 23:17:53 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=4uSkK3WkXQ83SIQup8JQNNEvRu56AWBD5QgPaEcLzcQ="}
2026/07/23 23:17:53 PG Recv: {"Type":"AuthenticationOK"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/23 23:17:53 PG Recv: {"Type":"BackendKeyData","ProcessID":95996064,"SecretKey":2681546283}
2026/07/23 23:17:53 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/23 23:17:53 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/23 23:17:53 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/23 23:17:53 PG Send: {"Type":"Sync"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:17:53 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/23 23:17:53 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/23 23:17:53 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/23 23:17:53 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/23 23:17:53 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/23 23:17:53 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/23 23:17:53 PG Send: {"Type":"Sync"}
2026/07/23 23:17:53 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:17:53 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/23 23:17:53 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/23 23:17:53 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/23 23:17:53 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/23 23:17:53 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/23 23:17:53 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/23 23:17:53 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/23 23:17:53 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/23 23:17:53 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 7"}
2026/07/23 23:17:53 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Remote database is up to date.
2026/07/23 23:17:53 HTTP POST: https://eu.i.posthog.com/batch/
2026/07/23 23:17:53 PG Send: {"Type":"Terminate"}
2026/07/23 23:17:53 HTTP GET: https://api.github.com/repos/supabase/cli/releases/latest
--- supabase-apply.log ---
open /home/runner/.supabase/profile: no such file or directory
Loading project ref from env var: wxagegieaaqxuzwobgtc
Using connection pooler: postgresql://postgres.wxagegieaaqxuzwobgtc@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
Using database password *** env var...
Supabase CLI 2.109.1
Using profile: supabase (supabase.co)
Connecting to remote database...
2026/07/23 23:17:54 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/23 23:17:54 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/23 23:17:54 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=NPaDlCghPggdu8cRWetmqTDe"}
2026/07/23 23:17:54 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=NPaDlCghPggdu8cRWetmqTDeRUhZOGRUcGpNRm15bHJ4Q3huYUJ6cnhDU3ViRA==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/23 23:17:54 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=NPaDlCghPggdu8cRWetmqTDeRUhZOGRUcGpNRm15bHJ4Q3huYUJ6cnhDU3ViRA==,p=7AjhY3AEd/hsJUckBnriY/SycvLuSqILcvqKwJJ18Tk="}
2026/07/23 23:17:54 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=fiNV5FU72NjhpHruwIYktFLD0D5bqLND6zoVYvQmwQ8="}
2026/07/23 23:17:54 PG Recv: {"Type":"AuthenticationOK"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/23 23:17:54 PG Recv: {"Type":"BackendKeyData","ProcessID":95996471,"SecretKey":1089060241}
2026/07/23 23:17:54 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/23 23:17:54 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/23 23:17:54 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/23 23:17:54 PG Send: {"Type":"Sync"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParseComplete"}
2026/07/23 23:17:54 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/23 23:17:54 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/23 23:17:54 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/23 23:17:54 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/23 23:17:54 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/23 23:17:54 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/23 23:17:54 PG Send: {"Type":"Sync"}
2026/07/23 23:17:55 PG Recv: {"Type":"BindComplete"}
2026/07/23 23:17:55 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/23 23:17:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/23 23:17:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/23 23:17:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/23 23:17:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/23 23:17:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/23 23:17:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/23 23:17:55 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/23 23:17:55 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 7"}
2026/07/23 23:17:55 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Remote database is up to date.
2026/07/23 23:17:55 PG Send: {"Type":"Terminate"}
2026/07/23 23:17:55 HTTP POST: https://eu.i.posthog.com/batch/
```
