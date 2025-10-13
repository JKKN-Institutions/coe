@echo off
echo ====================================
echo Course Order Migration Script
echo ====================================
echo.
echo This script will update the course_order column to support decimal values.
echo.
echo Please follow these steps:
echo 1. Open your Supabase Dashboard (https://app.supabase.com)
echo 2. Navigate to your project
echo 3. Go to SQL Editor
echo 4. Copy and paste the SQL from: supabase\migrations\20251013_update_course_order_to_decimal.sql
echo 5. Run the SQL query
echo.
echo Press any key to view the SQL migration content...
pause >nul
echo.
echo ====================================
echo SQL Migration Content:
echo ====================================
type "supabase\migrations\20251013_update_course_order_to_decimal.sql"
echo.
echo ====================================
echo End of SQL Migration
echo ====================================
echo.
pause
