# Madhyamgram Rabindra Academy - Deployment Guide

This guide outlines the steps to deploy the application to a production Linux VPS (e.g., Hostinger VPS).

## 1. Prerequisites
- A Linux VPS (Ubuntu 22.04+ recommended)
- Node.js 20+ installed
- PostgreSQL 14+ installed and running
- A domain name pointing to your VPS IP

## 2. Database Setup
1. Log into PostgreSQL: `sudo -u postgres psql`
2. Create the database: `CREATE DATABASE "Madhyamgram-Rabindra-Academy";`
3. Create a dedicated user: `CREATE USER aritrada420 WITH PASSWORD 'Aritradutta@2005';`
4. Grant privileges: `GRANT ALL PRIVILEGES ON DATABASE "Madhyamgram-Rabindra-Academy" TO aritrada420;`

## 3. Server Setup
1. Clone the repository: `git clone <your-repo-url>`
2. Install dependencies:
   ```bash
   npm run install-all
   ```
3. Configure Environment Variables:
   - Create `server/.env`:
     ```env
     PORT=5000
     NODE_ENV=production
     DATABASE_URL=postgresql://aritrada420:Aritradutta%402005@localhost:5432/Madhyamgram-Rabindra-Academy
     JWT_SECRET=your_secure_random_jwt_secret
     ALLOWED_ORIGINS=https://your-academy-domain.com
     ```
   - Create `client/.env.production`:
     ```env
     VITE_API_BASE_URL=https://your-academy-domain.com/api
     VITE_API_URL=https://your-academy-domain.com
     ```

## 4. Build the Application
1. Build the Backend:
   ```bash
   cd server && npm run build
   ```
2. Build the Frontend:
   ```bash
   cd ../client && npm run build
   ```

## 5. Process Management (PM2)
Install PM2 globally to keep the server running: `sudo npm install -g pm2`
1. Start the backend:
   ```bash
   cd ../server
   pm2 start dist/index.js --name "mra-backend"
   ```
2. Save pm2 list: `pm2 save && pm2 startup`

## 6. Reverse Proxy (Nginx)
Configure Nginx to serve the frontend, proxy API requests, and handle Socket.io.

1. Create a config file: `sudo nano /etc/nginx/sites-available/mra`
2. Recommended Nginx Config:
   ```nginx
   server {
       listen 80;
       server_name your-academy-domain.com;

       # Gzip Compression for Speed
       gzip on;
       gzip_types text/plain text/css application/json application/javascript text/xml;

       # Frontend
       location / {
           root /path/to/Madhyamgram-Rabindra-Academy/client/dist;
           try_files $uri /index.html;
       }

       # Backend API
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Socket.io Support
       location /socket.io/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Uploaded Media (Optimized Direct Serving)
       location /uploads {
           alias /path/to/Madhyamgram-Rabindra-Academy/server/uploads;
           expires 1d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```
3. Enable the site: `sudo ln -s /etc/nginx/sites-available/mra /etc/nginx/sites-enabled/`
4. Test and restart Nginx: `sudo nginx -t && sudo systemctl restart nginx`

## 7. SSL (Certbot)
Secure your site with HTTPS:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-academy-domain.com
```

Your Madhyamgram Rabindra Academy application is now live, optimized, and secure!
