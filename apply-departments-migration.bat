@echo off
echo ============================================
echo Applying Departments Table Migration
echo ============================================
echo.

echo Checking Supabase CLI...
supabase --version
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Supabase CLI not found!
    echo.
    echo Please install it first:
    echo   npm install -g supabase
    echo.
    echo Or use the Supabase Dashboard to run the SQL manually.
    echo.
    pause
    exit /b 1
)

echo.
echo Applying migration...
echo.

supabase db push

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo ✅ Migration applied successfully!
    echo ============================================
    echo.
    echo Next steps:
    echo 1. Refresh your browser
    echo 2. Navigate to Departments page
    echo 3. Test CRUD operations
    echo.
) else (
    echo.
    echo ============================================
    echo ❌ Migration failed!
    echo ============================================
    echo.
    echo Try these alternatives:
    echo.
    echo OPTION 1: Manual SQL execution
    echo   1. Open Supabase Dashboard
    echo   2. Go to SQL Editor
    echo   3. Copy contents from:
    echo      supabase/migrations/20250103_create_departments_table.sql
    echo   4. Run the SQL
    echo.
    echo OPTION 2: Check connection
    echo   supabase link
    echo   supabase db push
    echo.
)

pause

