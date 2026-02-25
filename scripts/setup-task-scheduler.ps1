# PowerShell script to set up Windows Task Scheduler for Overwatch Stats Scraper
# Run this script with: .\scripts\setup-task-scheduler.ps1

$TaskName = "Overwatch Stats Scraper"
$ScriptPath = "E:\Overwatch-Site\scraper\src\scraper.js"
$WorkingDirectory = "E:\Overwatch-Site\scraper"
$NodePath = (Get-Command node).Source

# Check if task already exists
$ExistingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue

if ($ExistingTask) {
    Write-Host "Task '$TaskName' already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

# Create action
$Action = New-ScheduledTaskAction `
    -Execute $NodePath `
    -Argument $ScriptPath `
    -WorkingDirectory $WorkingDirectory

# Create trigger (daily at 2:00 AM)
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

# Create settings
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Create principal (run whether user is logged on or not)
$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `
    -RunLevel Limited

# Register the task
Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Daily scraper for Overwatch 2 hero statistics"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Task Scheduler Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Task Name: $TaskName"
Write-Host "Schedule: Daily at 2:00 AM"
Write-Host "Script: $ScriptPath"
Write-Host ""
Write-Host "To verify the task was created, run:" -ForegroundColor Cyan
Write-Host "  Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Cyan
Write-Host ""
Write-Host "To run the task manually, run:" -ForegroundColor Cyan
Write-Host "  Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Cyan
Write-Host ""
Write-Host "To view task history, open Task Scheduler GUI:" -ForegroundColor Cyan
Write-Host "  taskschd.msc" -ForegroundColor Cyan
Write-Host ""
