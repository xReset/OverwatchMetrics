# Manual run script for the scraper
# Run this script with: .\scraper\run.ps1

Write-Host "Starting Overwatch Stats Scraper..." -ForegroundColor Cyan
Write-Host ""

node src/scraper.js

Write-Host ""
Write-Host "Scraper execution complete." -ForegroundColor Green
Write-Host "Check logs at: scraper/logs/scraper.log" -ForegroundColor Cyan
