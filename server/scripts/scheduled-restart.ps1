# ========================================
# Docker Container Scheduled Restart Script
# ========================================
# Purpose: Gracefully restart the Water Quality Monitoring server container
# Schedule: Every Saturday at 12:00 AM Philippine Time
# 
# This script is a BACKUP mechanism. The primary restart is handled by
# the application's internal cron job (node-cron).
#
# To set up this script with Windows Task Scheduler:
# 1. Open Task Scheduler (taskschd.msc)
# 2. Create New Task (not Basic Task)
# 3. General Tab:
#    - Name: "Water Quality Server - Weekly Restart"
#    - Run whether user is logged on or not
#    - Run with highest privileges
# 4. Triggers Tab:
#    - New Trigger
#    - Begin: On a schedule
#    - Weekly, every 1 week on Saturday
#    - Start: 12:00:00 AM
#    - Enabled: Yes
# 5. Actions Tab:
#    - New Action
#    - Program/script: powershell.exe
#    - Arguments: -ExecutionPolicy Bypass -File "C:\Users\Administrator\Desktop\Capstone-Final-Final\server\scripts\scheduled-restart.ps1"
# 6. Conditions Tab:
#    - Uncheck "Start only if computer is on AC power"
# 7. Settings Tab:
#    - Check "Run task as soon as possible after scheduled start is missed"
#    - Check "If task fails, restart every: 5 minutes, Attempt to restart up to 3 times"
# ========================================

# Configuration
$CONTAINER_NAME = "server_app"
$LOG_DIR = "C:\Users\Administrator\Desktop\Capstone-Final-Final\server\logs"
$LOG_FILE = Join-Path $LOG_DIR "scheduled-restart-$(Get-Date -Format 'yyyy-MM').log"
$MAX_WAIT_SECONDS = 30

# Ensure log directory exists
if (-not (Test-Path $LOG_DIR)) {
    New-Item -ItemType Directory -Path $LOG_DIR -Force | Out-Null
}

# Logging function
function Write-Log {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    Add-Content -Path $LOG_FILE -Value $logMessage
}

# Main execution
try {
    Write-Log "========================================" "INFO"
    Write-Log "Starting scheduled container restart" "INFO"
    Write-Log "Container: $CONTAINER_NAME" "INFO"
    Write-Log "========================================" "INFO"

    # Check if Docker is running
    Write-Log "Checking Docker daemon status..." "INFO"
    $dockerStatus = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Log "Docker daemon is not running or not accessible" "ERROR"
        Write-Log "Error: $dockerStatus" "ERROR"
        exit 1
    }
    Write-Log "Docker daemon is running" "INFO"

    # Check if container exists
    Write-Log "Checking if container exists..." "INFO"
    $containerExists = docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format "{{.Names}}"
    if ($containerExists -ne $CONTAINER_NAME) {
        Write-Log "Container '$CONTAINER_NAME' not found" "ERROR"
        exit 1
    }
    Write-Log "Container found: $CONTAINER_NAME" "INFO"

    # Get container status before restart
    $containerStatus = docker inspect --format='{{.State.Status}}' $CONTAINER_NAME
    Write-Log "Current container status: $containerStatus" "INFO"

    # Gracefully stop the container (triggers SIGTERM, which calls graceful shutdown)
    Write-Log "Sending stop signal to container (graceful shutdown)..." "INFO"
    docker stop --time=$MAX_WAIT_SECONDS $CONTAINER_NAME 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Container stopped successfully" "INFO"
    } else {
        Write-Log "Warning: Container stop may have encountered issues" "WARN"
    }

    # Start the container
    Write-Log "Starting container..." "INFO"
    docker start $CONTAINER_NAME 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Log "Container started successfully" "INFO"
    } else {
        Write-Log "Failed to start container" "ERROR"
        exit 1
    }

    # Wait for container to be healthy
    Write-Log "Waiting for container to become healthy..." "INFO"
    $maxAttempts = 10
    $attempt = 0
    $healthy = $false

    while ($attempt -lt $maxAttempts -and -not $healthy) {
        Start-Sleep -Seconds 3
        $attempt++
        
        $health = docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>$null
        if ($health -eq "healthy") {
            $healthy = $true
            Write-Log "Container is healthy (attempt $attempt/$maxAttempts)" "INFO"
        } elseif ($health -eq "") {
            # No health check defined, check if running
            $status = docker inspect --format='{{.State.Status}}' $CONTAINER_NAME
            if ($status -eq "running") {
                $healthy = $true
                Write-Log "Container is running (no health check defined)" "INFO"
            }
        } else {
            Write-Log "Health status: $health (attempt $attempt/$maxAttempts)" "INFO"
        }
    }

    if (-not $healthy) {
        Write-Log "Container did not become healthy within expected time" "WARN"
        Write-Log "Check container logs: docker logs $CONTAINER_NAME" "INFO"
    }

    # Get final status
    $finalStatus = docker inspect --format='{{.State.Status}}' $CONTAINER_NAME
    Write-Log "Final container status: $finalStatus" "INFO"

    Write-Log "========================================" "INFO"
    Write-Log "Scheduled restart completed successfully" "INFO"
    Write-Log "Next restart: Next Saturday at 12:00 AM" "INFO"
    Write-Log "========================================" "INFO"

    exit 0

} catch {
    Write-Log "========================================" "ERROR"
    Write-Log "Scheduled restart failed" "ERROR"
    Write-Log "Error: $_" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
    Write-Log "========================================" "ERROR"
    exit 1
}
