@echo off
echo Cleaning up old processes...
taskkill /F /IM ngrok.exe /T 2>nul
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul

echo Starting Need2Done Services...


echo Starting Admin Dashboard (vite)
cd admin-dashboard
start cmd /k "npm run dev"
cd ..

echo Starting Backend Node.js Server
cd backend
start cmd /k "npm run dev"
cd ..

echo Starting N2D WhatsApp Bot (FastAPI)
cd N2D_whatsapp_bot
start cmd /k "venv_n2d\Scripts\activate && uvicorn app:app --host 0.0.0.0 --port 8000 --reload"
cd ..

echo Starting ngrok tunnel
start cmd /k ".\ngrok.exe http 5000"

echo All services started!
