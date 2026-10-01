@echo off
setlocal
cd /d "%~dp0"

where mvn >nul 2>nul
if errorlevel 1 (
  if exist "mvnw.cmd" (
    set "MVN=mvnw.cmd"
  ) else (
    echo Maven was not found on PATH and mvnw.cmd is missing.
    echo Install Maven 3.9+ or restore the Maven Wrapper, then retry.
    exit /b 1
  )
) else (
  set "MVN=mvn"
)

call %MVN% -B test %*
