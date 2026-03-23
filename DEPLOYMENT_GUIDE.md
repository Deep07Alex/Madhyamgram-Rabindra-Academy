# Madhyamgram Rabindra Academy - Complete Production Deployment Guide

This guide provides a comprehensive, step-by-step plan to deploy the Academy Portal to a Linux VPS (Ubuntu 22.04+ Recommended). It includes the latest modules such as the progressive Results PDF system, Live-search Fees Management, and Attendance tracking.

---

## 1. Initial VPS Preparation

Connect to your VPS via SSH and install the core dependencies.

```bash
# Update System Packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL (Database)
sudo apt install postgresql postgresql-contrib -y

# Install PM2 (Process Manager for Node.js) globally
sudo npm install -g pm2

# Install Nginx (Web Server / Reverse Proxy)
sudo apt install nginx -y
```

---

## 2. Database Infrastructure Setup

The system requires a PostgreSQL database to store students, teachers, fees, and attendance.

1. **Access PostgreSQL as the default `postgres` user**:
   ```bash
   sudo -u postgres psql
   ```

2. **Create User & Database** (Replace passwords as needed in production):
   ```sql
   CREATE DATABASE "Madhyamgram-Rabindra-Academy";
   CREATE USER aritrada420 WITH PASSWORD 'Aritradutta@2005';
   GRANT ALL PRIVILEGES ON DATABASE "Madhyamgram-Rabindra-Academy" TO aritrada420;
   
   -- Grant schema privileges (Important for Postgres 15+)
   \c "Madhyamgram-Rabindra-Academy"
   GRANT ALL ON SCHEMA public TO aritrada420;
   \q
   ```

---

## 3. Project Cloning & Configuration

1. **Clone the Repository** to your server (e.g., in `/var/www/` or your home directory `~/`):
   ```bash
   cd ~
   git clone <your-repo-url> Academy-Portal
   cd Academy-Portal
   ```

2. **Install All Dependencies** (Frontend & Backend):
   ```bash
   npm run install-all
   ```

### 3.1 Setup Environment Variables

You need to create the `.env` files for both the server and the client.

**Create Backend Environment File:**
```bash
nano server/.env
```
Paste the following (Ensure the `@` in the DB password is URL-encoded as `%40`):
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://aritrada420:Aritradutta%402005@localhost:5432/Madhyamgram-Rabindra-Academy
JWT_SECRET=your_super_secret_jwt_key_here
ALLOWED_ORIGINS=https://madhyamgramrabindraacademy.in,https://www.madhyamgramrabindraacademy.in
```
*(Save and exit nano: `Ctrl+O`, `Enter`, `Ctrl+X`)*

**Create Frontend Environment File:**
```bash
nano client/.env.production
```
Paste the following:
```env
VITE_API_BASE_URL=https://madhyamgramrabindraacademy.in/api
```

---

## 4. Initialize the Database Schema

Run the production setup script to create all tables (including the new `MonthlyFee`, `AdmissionFee`, and `Notice` tables) and the default admin account.

```bash
# Run this from the root of the project
psql -U aritrada420 -d "Madhyamgram-Rabindra-Academy" -h 127.0.0.1 -f database_production_setup.sql
```
*(Enter the password `Aritradutta@2005` when prompted).*

> **Note:** The backend server uses `CREATE TABLE IF NOT EXISTS` in `initDb.ts` on startup, ensuring any missing tables are generated automatically idempotently without breaking existing data.

---

## 5. File Upload Permissions

The backend stores images (student photos, gallery, notices) in `server/uploads/`. Ensure this directory exists and has the correct permissions so the Node server can write to it.

```bash
mkdir -p server/uploads
chmod -R 755 server/uploads
```

---

## 6. Build Phase

Generate the optimized production bundles for React and compile the Node.js TypeScript API.

```bash
# Ensure you are in the project root
npm run build-all
```
This command builds the frontend into `client/dist/` and the backend into `server/dist/`.

---

## 7. Start the Backend with PM2

Run the backend API using PM2 to ensure it stays online permanently and restarts on crashes.

```bash
cd server
pm2 start dist/index.js --name "academy-api" --time

# Save the PM2 process list so it starts on server reboot
pm2 save
pm2 startup
```
*(Run the command PM2 gives you in the output of `pm2 startup`)*

---

## 8. Reverse Proxy Configuration (Nginx)

Nginx will serve the React frontend static files incredibly fast, and securely proxy `/api` requests to the Node backend.

1. **Create Site Configuration**:
   ```bash
   sudo nano /etc/nginx/sites-available/academy
   ```

2. **Paste the following Nginx Config** (Make sure to replace `/path/to/Academy-Portal` with your actual absolute path, e.g., `/home/ubuntu/Academy-Portal`):
   ```nginx
   server {
       listen 80;
       server_name madhyamgramrabindraacademy.in www.madhyamgramrabindraacademy.in;

       # 1. Serve Frontend React App
       location / {
           root /home/Madhyamgram-Rabindra-Academy/client/dist;
           try_files $uri $uri/ /index.html;
           
           # Cache static assets for performance
           location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
               expires 30d;
               add_header Cache-Control "public, no-transform";
           }
       }

       # 2. Proxy Backend API
       location /api/ {
           proxy_pass http://localhost:5000/;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           
           # Pass real IP to backend for rate limiting
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # 3. Serve Uploaded Files securely
       location /uploads/ {
           alias /home/Madhyamgram-Rabindra-Academy/server/uploads/;
           autoindex off;
           expires 30d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```

3. **Enable the Site & Restart Nginx**:
   ```bash
   # Remove default nginx config to prevent conflicts
   sudo rm /etc/nginx/sites-enabled/default

   # Enable our config
   sudo ln -s /etc/nginx/sites-available/academy /etc/nginx/sites-enabled/

   # Test config syntax
   sudo nginx -t

   # Restart Nginx
   sudo systemctl restart nginx
   ```

---

## 9. Security & SSL (HTTPS)

Secure the portal with a free SSL certificate from Let's Encrypt.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d madhyamgramrabindraacademy.in -d www.madhyamgramrabindraacademy.in
```
*Follow the interactive prompt. Choose to redirect HTTP to HTTPS.*

---

## 10. Final Verification Checklist

- [ ] **Admin Login**: Visit `https://madhyamgramrabindraacademy.in/admin-login` and login with `aritrada420`.
- [ ] **Module Check**: Verify the **💳 Fees** section (Live search & Due calculation).
- [ ] **Results System**: Verify progressive Unit test inputs and the custom PDF generator (`html2canvas` / `jspdf`).
- [ ] **Image Uploads**: Try adding a Notice with an image attachment to ensure `/uploads/` permissions are correct.
- [ ] **Database Backups**: (Optional but Recommended) Set up a cron job for daily `pg_dump` of the `"Madhyamgram-Rabindra-Academy"` database.

**🎉 DEPLOYMENT COMPLETE. MADHYAMGRAM RABINDRA ACADEMY IS NOW LIVE. 🎉**
