# Supabase-Datenbank-Deployment

- Status: erfolgreich
- Zeitpunkt (UTC): 2026-07-24T07:24:06Z
- Commit: 4e8d1bc6e2d8ae0d4a96e201d057317309858933
- Secrets geprüft: success
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
2026/07/24 07:23:54 PG Send: {"Type":"StartupMessage","ProtocolVersion":196608,"Parameters":{"database":"postgres","user":"postgres.wxagegieaaqxuzwobgtc"}}
2026/07/24 07:23:54 PG Recv: {"Type":"AuthenticationSASL","AuthMechanisms":["SCRAM-SHA-256"]}
2026/07/24 07:23:54 PG Send: {"Type":"SASLInitialResponse","AuthMechanism":"SCRAM-SHA-256","Data":"n,,n=,r=j2G9Ih9/jIjSnwZiIIjQB+z0"}
2026/07/24 07:23:54 PG Recv: {"Type":"AuthenticationSASLContinue","Data":"r=j2G9Ih9/jIjSnwZiIIjQB+z0RUk1elBFdGpIeUxTRHZQOHJPY2Z2cTVEU0ZZSw==,s=eO/JRUOoMGR440gkKqVPQg==,i=4096"}
2026/07/24 07:23:54 PG Send: {"Type":"SASLResponse","Data":"c=biws,r=j2G9Ih9/jIjSnwZiIIjQB+z0RUk1elBFdGpIeUxTRHZQOHJPY2Z2cTVEU0ZZSw==,p=XPRF1XhcQfLJJAbq6VacQ/mECG3BsOYMWFrZxPLOmKs="}
2026/07/24 07:23:54 PG Recv: {"Type":"AuthenticationSASLFinal","Data":"v=1FUthTA3c/SZ5Cx3zJrLV9KwPxotu0/1pszvOmDOpmo="}
2026/07/24 07:23:54 PG Recv: {"Type":"AuthenticationOK"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"DateStyle","Value":"ISO, MDY"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"IntervalStyle","Value":"postgres"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"TimeZone","Value":"UTC"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"application_name","Value":"Supavisor"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"client_encoding","Value":"UTF8"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"default_transaction_read_only","Value":"off"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"in_hot_standby","Value":"off"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"integer_datetimes","Value":"on"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"is_superuser","Value":"off"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"scram_iterations","Value":"4096"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"server_encoding","Value":"UTF8"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"server_version","Value":"17.6"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"session_authorization","Value":"postgres"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterStatus","Name":"standard_conforming_strings","Value":"on"}
2026/07/24 07:23:54 PG Recv: {"Type":"BackendKeyData","ProcessID":93581337,"SecretKey":3712868251}
2026/07/24 07:23:54 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 07:23:54 PG Send: {"Type":"Parse","Name":"lrupsc_1_0","Query":"SELECT version FROM supabase_migrations.schema_migrations ORDER BY version","ParameterOIDs":null}
2026/07/24 07:23:54 PG Send: {"Type":"Describe","ObjectType":"S","Name":"lrupsc_1_0"}
2026/07/24 07:23:54 PG Send: {"Type":"Sync"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParseComplete"}
2026/07/24 07:23:54 PG Recv: {"Type":"ParameterDescription","ParameterOIDs":[]}
2026/07/24 07:23:54 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 07:23:54 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
2026/07/24 07:23:54 PG Send: {"Type":"Bind","DestinationPortal":"","PreparedStatement":"lrupsc_1_0","ParameterFormatCodes":null,"Parameters":[],"ResultFormatCodes":[0]}
2026/07/24 07:23:54 PG Send: {"Type":"Describe","ObjectType":"P","Name":""}
2026/07/24 07:23:54 PG Send: {"Type":"Execute","Portal":"","MaxRows":0}
2026/07/24 07:23:54 PG Send: {"Type":"Sync"}
2026/07/24 07:23:54 PG Recv: {"Type":"BindComplete"}
2026/07/24 07:23:54 PG Recv: {"Type":"RowDescription","Fields":[{"Name":"version","TableOID":17482,"TableAttributeNumber":1,"DataTypeOID":25,"DataTypeSize":-1,"TypeModifier":-1,"Format":0}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723143000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723190000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723193000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723194500"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260723210000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724000000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724001000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724002100"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724010000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724020000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724021000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"DataRow","Values":[{"text":"20260724022000"}]}
2026/07/24 07:23:54 PG Recv: {"Type":"CommandComplete","CommandTag":"SELECT 12"}
2026/07/24 07:23:54 PG Recv: {"Type":"ReadyForQuery","TxStatus":"I"}
Would push these migrations:
 • 20260724023000_grant_challenge_round_read_access.sql
Finished supabase db push.
2026/07/24 07:23:54 PG Send: {"Type":"Terminate"}
2026/07/24 07:23:54 HTTP POST: https://eu.i.posthog.com/batch/
2026/07/24 07:23:55 HTTP GET: https://api.github.com/repos/supabase/cli/releases/latest
--- supabase-apply.log ---
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/role/role.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/role/role.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/rule/rule.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/rule/rule.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/schema/schema.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/schema/schema.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/sequence/sequence.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/sequence/sequence.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/subscription/subscription.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/table/table.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/table/table.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/trigger/trigger.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/trigger/trigger.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/composite-type/composite-type.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/composite-type/composite-type.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/enum/enum.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/enum/enum.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/range/range.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/range/range.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/view/view.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/view/view.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/export/file-mapper.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/catalog.diff.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/sort/sort-changes.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/base.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/base.privilege-diff.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/security-label.types.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/extract-with-retry.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved picomatch from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/integrations/filter/flatten.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/picomatch/4.0.5
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/sort/debug-visualization.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved package folder of @supabase/pg-delta@1.0.0-alpha.27 to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/context.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/depend.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/aggregate/aggregate.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/aggregate/aggregate.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/base.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/security-label.types.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/base.privilege-diff.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/collation/collation.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/collation/collation.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/domain/domain.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/domain/domain.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/event-trigger/event-trigger.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/event-trigger/event-trigger.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/extension/extension.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/extension/extension.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/foreign-data-wrapper/foreign-data-wrapper.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/foreign-data-wrapper/foreign-data-wrapper.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/foreign-table/foreign-table.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/foreign-table/foreign-table.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/server/server.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/server/server.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/user-mapping/user-mapping.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/foreign-data-wrapper/user-mapping/user-mapping.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/index/index.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/index/index.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/extract-with-retry.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/materialized-view/materialized-view.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/materialized-view/materialized-view.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/table/table.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/table/table.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/procedure/procedure.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/procedure/procedure.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/publication/publication.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/publication/publication.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/rls-policy/rls-policy.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/rls-policy/rls-policy.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/role/role.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/role/role.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/rule/rule.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/rule/rule.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/schema/schema.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/schema/schema.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/sequence/sequence.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/sequence/sequence.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/subscription/subscription.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/trigger/trigger.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/trigger/trigger.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/composite-type/composite-type.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/composite-type/composite-type.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/enum/enum.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/enum/enum.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/range/range.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/type/range/range.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved @ts-safeql/sql-tag from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/view/view.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/@ts-safeql/sql-tag/0.2.2
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/objects/view/view.model.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved zod from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/catalog.snapshot.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/zod/4.4.3
DEBUG Resolved picomatch from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/integrations/filter/flatten.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/picomatch/4.0.5
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/export/file-mapper.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/catalog.diff.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved pg from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/postgres-config.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg/8.22.0
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/sort/sort-changes.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved debug from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/sort/debug-visualization.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3
DEBUG Resolved pg from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/plan/create.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg/8.22.0
DEBUG Resolved ms from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/debug/4.4.3/src/common.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/ms/2.1.3
DEBUG Resolved pg-types from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg/8.22.0/lib/defaults.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-types/2.2.0
DEBUG Resolved postgres-array from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-types/2.2.0/lib/textParsers.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/postgres-array/2.0.0
DEBUG Resolved postgres-date from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-types/2.2.0/lib/textParsers.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/postgres-date/1.0.7
DEBUG Resolved postgres-interval from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-types/2.2.0/lib/textParsers.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/postgres-interval/1.2.0
DEBUG Resolved xtend/mutable from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/postgres-interval/1.2.0/index.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/xtend/4.0.2
DEBUG Resolved postgres-bytea from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-types/2.2.0/lib/textParsers.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/postgres-bytea/1.0.1
DEBUG Resolved pg-int8 from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-types/2.2.0/lib/binaryParsers.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-int8/1.0.1
DEBUG Resolved pg-connection-string from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg/8.22.0/lib/connection-parameters.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-connection-string/2.14.0
DEBUG Resolved pg-protocol from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg/8.22.0/lib/connection.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-protocol/1.15.0
DEBUG Resolved pg-pool from file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg/8.22.0/lib/index.js to /var/tmp/sb-compile-edge-runtime/node_modules/localhost/pg-pool/3.14.0
runtime has escaped from the event loop unexpectedly: event loop error: Error: Failed to read certificate file '/workspace/supabase/.temp/pgdelta/pgdelta-target-ca.crt': ENOENT: no such file or directory, open '/workspace/supabase/.temp/pgdelta/pgdelta-target-ca.crt'
    at getCertValue (file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/plan/ssl-config.js:44:27)
    at async parseSslConfig (file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/plan/ssl-config.js:62:23)
    at async createManagedPool (file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/postgres-config.js:340:23)
    at async file:///var/tmp/sb-compile-edge-runtime/index.ts:10:25
main worker has been destroyed
event loop error: Error: Failed to read certificate file '/workspace/supabase/.temp/pgdelta/pgdelta-target-ca.crt': ENOENT: no such file or directory, open '/workspace/supabase/.temp/pgdelta/pgdelta-target-ca.crt'
    at getCertValue (file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/plan/ssl-config.js:44:27)
    at async parseSslConfig (file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/plan/ssl-config.js:62:23)
    at async createManagedPool (file:///var/tmp/sb-compile-edge-runtime/node_modules/localhost/@supabase/pg-delta/1.0.0-alpha.27/dist/core/postgres-config.js:340:23)
    at async file:///var/tmp/sb-compile-edge-runtime/index.ts:10:25

Finished supabase db push.
2026/07/24 07:24:05 PG Send: {"Type":"Terminate"}
2026/07/24 07:24:05 HTTP POST: https://eu.i.posthog.com/batch/
```
