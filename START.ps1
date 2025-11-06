# 🚀 START REDAXIS HRMS
# This script helps you start both backend and frontend servers

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "   REDAXIS HRMS - STARTUP SCRIPT" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if MongoDB is running (local installation)
Write-Host "📊 Checking MongoDB status..." -ForegroundColor Yellow
$mongoService = Get-Service -Name "MongoDB*" -ErrorAction SilentlyContinue

if ($mongoService) {
    if ($mongoService.Status -eq "Running") {
        Write-Host "✅ MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB service found but not running" -ForegroundColor Yellow
        Write-Host "   Attempting to start MongoDB..." -ForegroundColor Yellow
        Start-Service $mongoService.Name
        Start-Sleep -Seconds 2
        Write-Host "✅ MongoDB started" -ForegroundColor Green
    }
} else {
    Write-Host "ℹ️  Local MongoDB not detected" -ForegroundColor Cyan
    Write-Host "   If using MongoDB Atlas, this is normal" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if database is seeded
Write-Host "🗄️  Have you seeded the database?" -ForegroundColor Yellow
Write-Host "   If this is your first time, run:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run seed" -ForegroundColor Gray
Write-Host ""

$response = Read-Host "Continue to start servers? (y/n)"
if ($response -ne "y") {
    Write-Host "❌ Startup cancelled" -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Start Backend Server in new window
Write-Host "🔧 Starting Backend Server..." -ForegroundColor Yellow
Write-Host "   Opening new terminal window for backend..." -ForegroundColor White

$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '🚀 BACKEND SERVER' -ForegroundColor Green; Write-Host '=================' -ForegroundColor Green; Write-Host ''; npm run dev"

Start-Sleep -Seconds 3

Write-Host "✅ Backend starting at http://localhost:5000" -ForegroundColor Green
Write-Host ""

# Start Frontend Server in new window
Write-Host "🎨 Starting Frontend Application..." -ForegroundColor Yellow
Write-Host "   Opening new terminal window for frontend..." -ForegroundColor White

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; Write-Host '🚀 FRONTEND APPLICATION' -ForegroundColor Cyan; Write-Host '======================' -ForegroundColor Cyan; Write-Host ''; npm run dev"

Write-Host "✅ Frontend starting at http://localhost:5173" -ForegroundColor Green
Write-Host ""

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ REDAXIS HRMS IS STARTING!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Quick Access:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "   Backend API: http://localhost:5000/api" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Login Credentials (see CREDENTIALS.md):" -ForegroundColor Yellow
Write-Host "   Admin: admin@redaxis.com / Admin@123" -ForegroundColor White
Write-Host "   HR: maria@redaxis.com / Maria@123" -ForegroundColor White
Write-Host "   Employee: john@redaxis.com / John@123" -ForegroundColor White
Write-Host ""
Write-Host "⏱️  Waiting 5 seconds for servers to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Open browser
Write-Host ""
Write-Host "🌐 Opening browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "✅ SYSTEM READY!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Keep these terminal windows open!" -ForegroundColor Yellow
Write-Host "   Close them to stop the servers" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to close this startup window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
