# Madhyamgram Rabindra Academy - Complete Production Deployment Guide

This guide provides a comprehensive, step-by-step plan to deploy the Academy Portal to a Linux VPS (e.g., Ubuntu 22.04+).

---

## 1. Initial VPS Preparation

Secure your server and install core dependencies.

```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Build Essentials & PM2
sudo npm install -g pm2
```

---

## 2. Database Infrastructure Setup

The application requires a PostgreSQL database.

1. Access PostgreSQL: `sudo -u postgres psql`
2. Create User & Database:

   ```sql
   CREATE USER aritrada420 WITH PASSWORD 'Aritradutta@2005';
   -- Database creation and schema is handled by the setup script below
   \q
   ```

3. Run Production Setup Script:
   From the project root on your VPS, execute the provided SQL script to initialize the schema, classes, and admin user:

   ```bash
   psql -U postgres -f database_production_setup.sql
   ```

   *Note: This script creates the "Madhyamgram-Rabindra-Academy" database and all required tables/indexes.*

---

## 3. Project Configuration

1. Clone Repository: `git clone <your-repo-url>`
2. Install All Dependencies:

   ```bash
   npm run install-all
   ```

### Environment Variables

Configure the backend and frontend for the live environment.

**Backend (`server/.env`):**

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://aritrada420:Aritradutta%402005@localhost:5432/Madhyamgram-Rabindra-Academy
JWT_SECRET=generate_a_long_random_string_here
ALLOWED_ORIGINS=https://your-academy-domain.com
```

**Frontend (`client/.env.production`):**

```env
VITE_API_BASE_URL=https://your-academy-domain.com/api
VITE_API_URL=https://your-academy-domain.com
```

---

## 4. Build Phase

Build the optimized production bundles.

```bash
# Build everything at once
npm run build-all

# Or manually:
# cd client && npm run build
# cd ../server && npm run build
```

---

## 5. Process Management (PM2)

We use PM2 to manage the backend process in cluster mode for high availability.

```bash
# From the project root
pm2 start ecosystem.config.js

# Ensure PM2 starts on boot
pm2 save
pm2 startup
```

---

## 6. Reverse Proxy & Networking (Nginx)

Nginx handles SSL termination, static file serving, and reverse proxying to the Node.js API with Socket.io/SSE support.

1. Configure Site: `sudo nano /etc/nginx/sites-available/academy`
2. Use the provided `nginx.conf` content:

   ```nginx
   # Copy content from 'nginx.conf' in the project root here.
   # Ensure you update 'server_name' and paths to match your VPS structure.
   ```

3. Enable Configuration:

   ```bash
   sudo ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

## 7. Security & SSL

Secure all traffic using Let's Encrypt.

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-academy-domain.com
```

---

## 8. Final Verification Checklist

- [ ] Admin Login works at `your-domain.com/login`
- [ ] Student results can be published and viewed.
- [ ] Live Attendance sync (SSE) is functional.
- [ ] Profile photos and homework uploads are stored in `/server/uploads`.
- [ ] DB backups are configured (recommended: daily `pg_dump`).

**Academy Portal is now Production Ready.**
