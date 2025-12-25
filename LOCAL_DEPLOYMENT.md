# Cherry Dining & Lounge POS - Local Deployment Guide

## Overview
This is a fully offline-capable POS system with a Node.js/Express backend and MySQL database.

## Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Frontend (UI)  │───▶│  Express Server │───▶│     MySQL       │
│  Static Build   │    │  /api endpoints │    │    Database     │
│     :3000       │    │  + Socket.IO    │    │     :3306       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Quick Start

### 1. Install MySQL
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

### 2. Create Database & User
```bash
sudo mysql
```
```sql
CREATE DATABASE cherry_dining;
CREATE USER 'pos_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON cherry_dining.* TO 'pos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Import Schema
```bash
mysql -u pos_user -p cherry_dining < server/schema.sql
```

### 4. Configure Database Connection
Edit `server/config/db.json`:
```json
{
  "host": "127.0.0.1",
  "port": 3306,
  "database": "cherry_dining",
  "user": "pos_user",
  "password": "your_secure_password"
}
```

### 5. Build Frontend
```bash
npm install
npm run build
```

### 6. Start Server
```bash
cd server
npm install
npm start
```

The app is now running at `http://localhost:3000`

## Changing Database (No Rebuild Required)
1. Edit `/opt/pos/config/db.json` (or `server/config/db.json`)
2. Restart the server: `pm2 restart cherry-dining`

## Default Login
- Email: `admin@cherrydining.com`
- Password: `admin123`

## Network Access
Access from other devices: `http://<YOUR_LOCAL_IP>:3000`

## Production Deployment with PM2
```bash
npm install -g pm2
cd server
pm2 start index.js --name cherry-dining
pm2 startup
pm2 save
```
