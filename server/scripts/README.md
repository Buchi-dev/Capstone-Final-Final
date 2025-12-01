# Server Scripts

This directory contains PowerShell scripts for managing the Water Quality Monitoring server container.

## Scripts Overview

### 🔄 scheduled-restart.ps1
**Purpose:** Automated weekly restart for Docker container  
**Usage:** Executed by Windows Task Scheduler  
**Schedule:** Every Saturday at 12:00 AM Philippine Time  

**Features:**
- Graceful container shutdown (30-second timeout)
- Health check verification after restart
- Comprehensive logging to `logs/scheduled-restart-*.log`
- Error handling and retry logic
- Automatic recovery

**Manual Execution:**
```powershell
.\scheduled-restart.ps1
```

**Requirements:**
- Docker Desktop running
- Administrator privileges
- Container name: `server_app`

---

### 🧪 manual-restart.ps1
**Purpose:** Manual testing and emergency restart  
**Usage:** Run directly for testing or troubleshooting  
**Interactive:** Requires confirmation before restart  

**Features:**
- Interactive confirmation prompt
- Real-time status updates
- Color-coded output
- Health check verification
- Helpful error messages

**Manual Execution:**
```powershell
.\manual-restart.ps1
```

**Use Cases:**
- Testing restart functionality
- Emergency restarts outside schedule
- Troubleshooting deployment issues
- Verifying graceful shutdown

---

## Quick Start

### Test the Restart Feature

1. **Navigate to scripts directory:**
   ```powershell
   cd C:\Users\Administrator\Desktop\Capstone-Final-Final\server\scripts
   ```

2. **Run manual restart:**
   ```powershell
   .\manual-restart.ps1
   ```

3. **Confirm when prompted:**
   ```
   Do you want to continue? (yes/no): yes
   ```

4. **Verify success:**
   ```powershell
   docker ps | Select-String "server_app"
   docker logs --tail 20 server_app
   ```

---

## Setup Windows Task Scheduler

### Quick Setup (PowerShell - Run as Administrator)

```powershell
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument '-ExecutionPolicy Bypass -File "C:\Users\Administrator\Desktop\Capstone-Final-Final\server\scripts\scheduled-restart.ps1"'
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Saturday -At 12:00AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName "Water Quality Server - Weekly Restart" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Description "Automatically restarts the Water Quality Monitoring server every Saturday at midnight"
```

### Verify Task

```powershell
# Check task exists
Get-ScheduledTask -TaskName "Water Quality Server - Weekly Restart"

# Test task manually
Start-ScheduledTask -TaskName "Water Quality Server - Weekly Restart"

# View task history
Get-ScheduledTaskInfo -TaskName "Water Quality Server - Weekly Restart"
```

---

## Logs

### Application Logs (Docker)

```powershell
# Real-time logs
docker logs -f server_app

# Last 100 lines
docker logs --tail 100 server_app

# Filter for restart events
docker logs server_app | Select-String "SCHEDULED RESTART"
```

### Script Logs (Host)

Located at: `../logs/scheduled-restart-YYYY-MM.log`

```powershell
# View latest log
Get-Content ..\logs\scheduled-restart-*.log -Tail 50

# View specific month
Get-Content ..\logs\scheduled-restart-2025-12.log

# Search for errors
Get-Content ..\logs\scheduled-restart-*.log | Select-String "ERROR"
```

---

## Troubleshooting

### Script Won't Execute

**Error:** "Execution policy restriction"

**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Or run with bypass:
```powershell
powershell.exe -ExecutionPolicy Bypass -File .\manual-restart.ps1
```

---

### Docker Not Found

**Error:** "docker: command not found"

**Solution:**
1. Ensure Docker Desktop is running
2. Add Docker to PATH:
   ```powershell
   $env:Path += ";C:\Program Files\Docker\Docker\resources\bin"
   ```

---

### Container Not Found

**Error:** "Container 'server_app' not found"

**Solution:**
```powershell
# List all containers
docker ps -a

# Check docker-compose
cd ..\
docker-compose ps

# Restart with docker-compose
docker-compose up -d
```

---

### Permissions Error

**Error:** "Access denied"

**Solution:**
```powershell
# Run PowerShell as Administrator
Start-Process powershell -Verb RunAs

# Or add user to docker-users group (requires logout)
net localgroup docker-users "YourUsername" /add
```

---

## Best Practices

### Before Running Scripts

- ✅ Verify Docker Desktop is running
- ✅ Check no critical operations are in progress
- ✅ Ensure sufficient disk space for logs
- ✅ Test in development first

### After Restart

- ✅ Check container status: `docker ps`
- ✅ Verify health endpoint: `curl http://localhost:5000/health`
- ✅ Review logs for errors: `docker logs server_app`
- ✅ Confirm devices reconnect: Check MQTT logs

### Regular Maintenance

- ✅ Review restart logs weekly
- ✅ Archive old logs monthly
- ✅ Test manual restart quarterly
- ✅ Update scripts as needed

---

## Script Customization

### Modify Container Name

Edit both scripts and change:
```powershell
$CONTAINER_NAME = "server_app"  # Change to your container name
```

### Modify Shutdown Timeout

Edit and change:
```powershell
$MAX_WAIT_SECONDS = 30  # Increase if shutdown takes longer
```

### Modify Log Retention

Edit `scheduled-restart.ps1` to change log cleanup:
```powershell
# Current: Keeps all logs in monthly files
# To add cleanup: Delete logs older than X days
```

---

## Related Documentation

- 📖 [Full Documentation](../SCHEDULED_RESTART.md) - Complete restart system guide
- 🚀 [Setup Guide](../SETUP_SCHEDULED_RESTART.md) - Quick setup instructions
- 🔧 [docker-compose.yml](../docker-compose.yml) - Container configuration
- 📝 [backgroundJobs.js](../src/jobs/backgroundJobs.js) - Application-level cron jobs

---

## Support

For issues or questions:

1. Check logs first (Docker + script logs)
2. Review troubleshooting section above
3. Test manually with `manual-restart.ps1`
4. Consult full documentation: `SCHEDULED_RESTART.md`

---

*Last Updated: December 1, 2025*
