@echo off
echo.
echo ========================================
echo   JKKN COE Email Function Deployment
echo ========================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Supabase CLI...
    npm install -g supabase
)

REM Check login status
echo Checking Supabase login status...
supabase projects list >nul 2>nul
if %errorlevel% neq 0 (
    echo Please login to Supabase:
    supabase login
)

REM Get project reference
echo.
echo Enter your Supabase Project Reference ID:
echo (Found in: Supabase Dashboard -^> Project Settings -^> General)
set /p PROJECT_REF="Project Ref: "

if "%PROJECT_REF%"=="" (
    echo ERROR: Project reference is required!
    pause
    exit /b 1
)

REM Link project
echo.
echo Linking project...
supabase link --project-ref %PROJECT_REF%
if %errorlevel% neq 0 (
    echo ERROR: Failed to link project
    pause
    exit /b 1
)

REM Deploy function
echo.
echo Deploying send-email function...
supabase functions deploy send-email
if %errorlevel% neq 0 (
    echo ERROR: Failed to deploy function
    pause
    exit /b 1
)

REM Get Resend API key
echo.
echo Enter your Resend API Key:
echo (Get it from: https://resend.com/api-keys)
set /p RESEND_API_KEY="API Key: "

if "%RESEND_API_KEY%"=="" (
    echo ERROR: Resend API Key is required!
    pause
    exit /b 1
)

REM Get sender email
echo.
echo Enter sender email address:
echo (e.g., noreply@yourdomain.com or use onboarding@resend.dev for testing)
set /p EMAIL_FROM="From Email: "

if "%EMAIL_FROM%"=="" (
    set EMAIL_FROM=onboarding@resend.dev
    echo Using default: %EMAIL_FROM%
)

REM Set secrets
echo.
echo Setting up secrets...
supabase secrets set RESEND_API_KEY=%RESEND_API_KEY%
supabase secrets set EMAIL_FROM=%EMAIL_FROM%

if %errorlevel% neq 0 (
    echo ERROR: Failed to set secrets
    pause
    exit /b 1
)

REM Success!
echo.
echo ========================================
echo   SUCCESS! Email function deployed
echo ========================================
echo.
echo Next steps:
echo   1. Create a new user in your application
echo   2. Check the user's email inbox
echo   3. View logs: supabase functions logs send-email
echo.
echo Documentation:
echo   - Quick Guide: QUICK_EMAIL_SETUP.md
echo   - Full Guide: SUPABASE_EMAIL_SETUP.md
echo.
echo Done!
echo.
pause