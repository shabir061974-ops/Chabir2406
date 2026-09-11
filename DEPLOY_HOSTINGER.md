# Faiha Co-operative — Hostinger Deployment Guide

This app is **FastAPI + MongoDB + React + Oracle (11g)**. Oracle 11g needs the Oracle
Instant Client (thick mode), so it will **NOT run on Hostinger shared/cPanel hosting**.
You must use a **Hostinger VPS (KVM, Ubuntu 22.04, x86_64)**. The steps below use Docker,
which bundles Python, Node, MongoDB, Nginx and the Oracle client for you.

---

## 0. What you need
- A Hostinger **VPS** (≥ 2 vCPU / 4 GB RAM recommended), Ubuntu 22.04.
- A domain pointed to the VPS IP (A record).
- Outbound network access from the VPS to your Oracle server `83.96.72.89:1521`
  (ask your Oracle admin to whitelist the VPS public IP).
- The project zip (`faiha-ecom.zip`) downloaded from Emergent.

---

## 1. Create & access the VPS
1. Hostinger hPanel → **VPS** → buy/select a KVM VPS → choose **Ubuntu 22.04** (plain, not a panel template).
2. Note the VPS **IP address** and root password.
3. From your computer, connect over SSH:
   ```bash
   ssh root@YOUR_VPS_IP
   ```

## 2. Install Docker
```bash
apt update && apt -y upgrade
curl -fsSL https://get.docker.com | sh
docker --version
docker compose version   # Docker Compose v2 is included
```

## 3. Upload the source code
Pick ONE method:

**A) SCP from your computer** (run on your LOCAL machine, not the VPS):
```bash
scp faiha-ecom.zip root@YOUR_VPS_IP:/root/
```
Then on the VPS:
```bash
cd /root && apt -y install unzip && unzip faiha-ecom.zip -d faiha-ecom && cd faiha-ecom
```

**B) Hostinger File Manager:** hPanel → File Manager → upload `faiha-ecom.zip` to `/root/`,
then unzip via SSH as above.

## 4. Configure secrets
```bash
cd /root/faiha-ecom
cp backend/.env.example backend/.env
nano backend/.env
```
Set these values:
- `JWT_SECRET` → run `python3 -c "import secrets;print(secrets.token_hex(32))"` and paste the output.
- `ADMIN_PASSWORD` → a strong admin password.
- `ORA_PASSWORD` → your real Oracle password.
- `CORS_ORIGINS` → `https://your-domain.com`
- Keep `MONGO_URL="mongodb://mongo:27017"` (Docker service name).

Then set your domain for the frontend build in `docker-compose.yml`:
```yaml
  frontend:
    build:
      args:
        REACT_APP_BACKEND_URL: "https://your-domain.com"
```
(Replace `your-domain.com` everywhere.)

## 5. Build & start
```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend   # watch for "Oracle pool initialized" then Ctrl+C
```
The site is now live on `http://YOUR_VPS_IP` (and your domain once DNS resolves).
Verify Oracle: `curl http://localhost/api/` → should show `"oracle": true`.

## 6. Point your domain + enable HTTPS (Let's Encrypt)
1. In your domain DNS, add an **A record** → VPS IP. Wait for it to resolve.
2. Easiest TLS: install Caddy OR use Certbot with the host Nginx. Quick Certbot route:
   ```bash
   apt -y install certbot
   docker compose stop frontend            # free port 80 for the cert challenge
   certbot certonly --standalone -d your-domain.com
   docker compose start frontend
   ```
   Then add a TLS server block to `frontend/nginx.conf` referencing the certs in
   `/etc/letsencrypt/live/your-domain.com/` and mount them into the frontend container
   (uncomment the `443:443` port in `docker-compose.yml` and add a volume for
   `/etc/letsencrypt`). Rebuild: `docker compose up -d --build frontend`.

   > Simplest alternative: put **Caddy** in front (auto-HTTPS) or use Hostinger's built-in
   > reverse proxy if available.

## 7. Admin login
- URL: `https://your-domain.com/admin/login`
- Email / password: whatever you set in `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

---

## Updating later
```bash
cd /root/faiha-ecom
# upload new zip / git pull, then:
docker compose up -d --build
```

## Backups (recommended)
```bash
docker compose exec mongo mongodump --archive=/data/db/backup-$(date +%F).gz --gzip
```
Copy the archive off the server on a schedule (cron + scp/object storage).

---

## Troubleshooting
- **`"oracle": false`** in `/api/`: the VPS can't reach `83.96.72.89:1521` (firewall) or the
  Oracle password is wrong. Test: `nc -vz 83.96.72.89 1521`. Ask the Oracle admin to whitelist
  the VPS IP. The app still runs (falls back to its seeded demo catalog) until Oracle is reachable.
- **Oracle client error on ARM VPS:** the backend `Dockerfile` downloads the **x86_64** Instant
  Client. If your VPS is ARM64, change that URL to the `linux.arm64` Instant Client build.
- **Frontend can't reach API:** make sure `REACT_APP_BACKEND_URL` (build arg) equals your real
  public URL and you rebuilt the frontend (`docker compose up -d --build frontend`).
- **Large catalog:** the storefront merges up to 1,000 live Oracle products per listing (cached
  90s). For browsing the full 480k+ catalog, ask us to add server-side Oracle search/pagination.
