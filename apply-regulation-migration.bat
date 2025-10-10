@echo off
echo Applying regulation_code migration to course_mapping table...
echo.

REM Get Supabase URL and Key from .env.local
for /f "tokens=1,2 delims==" %%a in ('findstr "NEXT_PUBLIC_SUPABASE_URL" .env.local') do set SUPABASE_URL=%%b
for /f "tokens=1,2 delims==" %%a in ('findstr "SUPABASE_SERVICE_ROLE_KEY" .env.local') do set SERVICE_ROLE_KEY=%%b

echo Supabase URL: %SUPABASE_URL%
echo.

REM Read the migration file
set MIGRATION_FILE=supabase\migrations\20251010_add_regulation_to_course_mapping.sql
echo Reading migration from: %MIGRATION_FILE%
echo.

REM Execute the migration using curl
curl -X POST "%SUPABASE_URL%/rest/v1/rpc/exec_sql" ^
  -H "apikey: %SERVICE_ROLE_KEY%" ^
  -H "Authorization: Bearer %SERVICE_ROLE_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "@%MIGRATION_FILE%"

echo.
echo Migration completed!
pause
