# ========================================
# Manual Container Restart Script
# ========================================
# Purpose: Manually trigger a graceful restart for testing
# Usage: ./manual-restart.ps1
# ========================================

$CONTAINER_NAME = "server_app"
$MAX_WAIT_SECONDS = 30

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Manual Container Restart" -ForegroundColor Cyan
Write-Host "Container: $CONTAINER_NAME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Docker is running
Write-Host "`nChecking Docker daemon..." -ForegroundColor Yellow
$dockerStatus = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker daemon is not running" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Docker daemon is running" -ForegroundColor Green

# Check if container exists
Write-Host "`nChecking container..." -ForegroundColor Yellow
$containerExists = docker ps -a --filter "name=^/${CONTAINER_NAME}$" --format "{{.Names}}"
if ($containerExists -ne $CONTAINER_NAME) {
    Write-Host "ERROR: Container '$CONTAINER_NAME' not found" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Container found" -ForegroundColor Green

# Get current status
$currentStatus = docker inspect --format='{{.State.Status}}' $CONTAINER_NAME
Write-Host "Current status: $currentStatus" -ForegroundColor Cyan

# Confirm restart
Write-Host "`nThis will gracefully restart the container." -ForegroundColor Yellow
$confirm = Read-Host "Do you want to continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Restart cancelled" -ForegroundColor Yellow
    exit 0
}

# Stop container
Write-Host "`nStopping container (graceful shutdown)..." -ForegroundColor Yellow
docker stop --time=$MAX_WAIT_SECONDS $CONTAINER_NAME
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Container stopped" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to stop container" -ForegroundColor Red
    exit 1
}

# Start container
Write-Host "`nStarting container..." -ForegroundColor Yellow
docker start $CONTAINER_NAME
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Container started" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to start container" -ForegroundColor Red
    exit 1
}

# Wait for health check
Write-Host "`nWaiting for container to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$finalStatus = docker inspect --format='{{.State.Status}}' $CONTAINER_NAME
Write-Host "Final status: $finalStatus" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Restart completed successfully!" -ForegroundColor Green
Write-Host "View logs: docker logs $CONTAINER_NAME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
