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

if not exist "target\bookstore-0.0.1-SNAPSHOT.jar" (
  echo Building the jar first...
  call %MVN% -B -q package -DskipTests
  if errorlevel 1 exit /b 1
)

echo Starting the Book Store API on http://localhost:8080
java -jar "target\bookstore-0.0.1-SNAPSHOT.jar" %*
