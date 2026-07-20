# Faiha Co-op Local Development Setup

## Project Overview

Faiha Co-operative E-Commerce application with:
- **Frontend**: React 19 + Tailwind CSS (port 3000)
- **Backend**: FastAPI (port 8001)
- **Database**: MongoDB 7 (port 27017)

---

## Quick Start Commands

### Step 1: Start MongoDB (Docker)

```powershell
docker start faiha-mongo
```

If container doesn't exist:
```powershell
docker run -d --name faiha-mongo -p 27017:27017 mongo:7
```

### Step 2: Start Backend

```powershell
cd D:\FaihaWebsite\Emergent\Chabir2406\backend
.venv\Scripts\python.exe -m uvicorn server:app --reload --port 8001
```

Or with inline environment variables:
```powershell
cd D:\FaihaWebsite\Emergent\Chabir2406\backend
$env:MONGO_URL="mongodb://localhost:27017"; $env:DB_NAME="faiha"; $env:JWT_SECRET="testsecret"; .venv\Scripts\python.exe -m uvicorn server:app --reload --port 8001
```

### Step 3: Start Frontend

```powershell
cd D:\FaihaWebsite\Emergent\Chabir2406\frontend
npm start
```

---

## Access URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001 |

---

## Login Credentials

- **Email**: faihait@faihacoopkw.com
- **Password**: whatever `ADMIN_PASSWORD` is set to in your local `backend/.env`

---

## Stopping Services

- **Backend/Frontend**: Press `Ctrl+C` in each terminal
- **MongoDB**: `docker stop faiha-mongo`

---

## Troubleshooting

### Port 3000 already in use
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Port 8001 already in use
```powershell
Get-NetTCPConnection -LocalPort 8001 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### MongoDB connection error
Ensure MongoDB is running:
```powershell
docker ps | findstr mongo
```

---

## Project Structure

```
FaihaWebsite/Emergent/Chabir2406/
├── backend/
│   ├── server.py        # FastAPI application
│   ├── .env             # Environment variables
│   ├── requirements.txt # Python dependencies
│   └── .venv/           # Virtual environment
│
├── frontend/
│   ├── src/             # React source code
│   ├── public/           # Static assets
│   ├── package.json     # Node dependencies
│   └── craco.config.js  # Webpack configuration
│
└── docker-compose.yml  # Docker orchestration
```

---

## Key Files Modified

| File | Purpose |
|------|---------|
| `backend/.env` | MongoDB URL, JWT secret |
| `frontend/public/index.html` | Title, favicon, branding |
| `frontend/src/components/storefront/Footer.jsx` | Contact info |
| `frontend/craco.config.js` | Dev server config (webpack fix) |

---

## Development Notes

### Backend API Endpoints
- `GET /api/settings` - App settings
- `GET /api/categories` - Product categories
- `GET /api/products` - Product list
- `POST /api/checkout/place-order` - Place order
- `POST /api/auth/login` - Admin login

### Admin Endpoints (require auth)
- `/api/admin/dashboard/summary`
- `/api/admin/orders`
- `/api/admin/products`
- `/api/admin/categories`

---

*Last updated: June 2026*