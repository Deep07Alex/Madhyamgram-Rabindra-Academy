# Madhyamgram Rabindra Academy - Complete Production Deployment Guide

This guide provides a comprehensive, step-by-step plan to deploy the Academy Portal to a Linux VPS (Ubuntu 22.04+ Recommended).

---

## 1. Initial VPS Preparation

Install core dependencies to support the full-stack environment.

```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Build Essentials & PM2 (Process Manager)
sudo npm install -g pm2
```

---

## 2. Database Infrastructure Setup

1. **Access PostgreSQL**: `sudo -u postgres psql`

2. **Create User & Database**:

   ```sql
   CREATE DATABASE "Madhyamgram-Rabindra-Academy";
   CREATE USER aritrada420 WITH PASSWORD 'Aritradutta@2005';
   GRANT ALL PRIVILEGES ON DATABASE "Madhyamgram-Rabindra-Academy" TO aritrada420;
   \q
   ```

3. **Initialize Schema**:

   From the project root on your VPS, run the optimized setup script:

   ```bash
   psql -U aritrada420 -d "Madhyamgram-Rabindra-Academy" -f database_production_setup.sql
   ```

   *Note: Even if you skip this, the server's `initDb.ts` will automatically create/update the schema on first start.*

---

## 3. Project Configuration

1. **Clone Repository**: `git clone <your-repo-url>`

2. **Install Dependencies**:

   ```bash
   npm run install-all
   ```

### Environment Variables

**Backend (`server/.env`):**

```env
PORT=5000
NODE_ENV=production
# Note: @ in password must be encoded as %40
DATABASE_URL=postgresql://aritrada420:Aritradutta%402005@localhost:5432/Madhyamgram-Rabindra-Academy
JWT_SECRET=your_super_secret_jwt_key
ALLOWED_ORIGINS=https://madhyamgramrabindraacademy.in,https://www.madhyamgramrabindraacademy.in
```

**Frontend (`client/.env.production`):**

```env
VITE_API_BASE_URL=https://madhyamgramrabindraacademy.in/api
```

---

## 4. Build Phase

Generate the optimized production bundles for React and the Node.js API.

```bash
# Automates building both frontend and backend
npm run build-all
```

---

## 5. Process Management (PM2)

Deploy the backend in `cluster` mode for maximum performance and zero-downtime restarts.

```bash
# Start the production process
pm2 start ecosystem.config.js --env production

# Ensure persistence on server reboot
pm2 save
pm2 startup
```

---

## 6. Reverse Proxy (Nginx)

Nginx serves the frontend static files and proxies API requests to the Node server.

1. **Configure Site**: `sudo nano /etc/nginx/sites-available/academy`

2. **Setup Server Block**:

   ```nginx
   server {
       listen 80;
       server_name madhyamgramrabindraacademy.in www.madhyamgramrabindraacademy.in;

       # Frontend Static Files (Vite build output)
       location / {
           root /path/to/your/project/client/dist;
           try_files $uri $uri/ /index.html;
           expires 30d;
       }

       # Backend API Proxy
       location /api/ {
           proxy_pass http://localhost:5000/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Uploads serving
       location /uploads/ {
           alias /path/to/your/project/server/uploads/;
           autoindex off;
       }
   }
   ```

3. **Enable & Restart**:

   ```bash
   sudo ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl restart nginx
   ```

---

## 7. Security & SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d madhyamgramrabindraacademy.in -d www.madhyamgramrabindraacademy.in
```

---

## 8. Final Verification Checklist

- [ ] **Admin Access**: Login at `/login` as `aritrada420`.
- [ ] **Performance**: Dashboard loads significantly faster due to SQL indexing.
- [ ] **Real-time**: Attendance sync and Notice updates are instant.
- [ ] **PDF Reports**: "Download Official PDF" generates professional reports.
- [ ] **Backups**: Set up a cron job for `pg_dump` daily.

**MADHYAMGRAM RABINDRA ACADEMY IS NOW LIVE.**
