# Hospitality AI Platform - Deployment Guide

Complete guide for deploying the Hospitality AI Assistant SaaS Platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Configuration](#configuration)
8. [Post-Deployment](#post-deployment)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **Node.js**: Version 18 or higher
- **PostgreSQL**: Version 15 or higher
- **Docker**: Version 20.10 or higher (for containerized deployment)
- **Docker Compose**: Version 2.0 or higher
- **Git**: Latest version

### Required API Keys

1. **Anthropic Claude API Key**
   - Sign up at: https://www.anthropic.com/
   - Get your API key from the console
   - Recommended model: `claude-3-sonnet-20240229`

2. **Telegram Bot Token**
   - Talk to @BotFather on Telegram
   - Create a new bot: `/newbot`
   - Copy the bot token provided

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hospitality-ai-platform
```

### 2. Create Environment Files

#### Backend Environment (.env)

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server Configuration
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospitality_ai
DB_USER=postgres
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE

# JWT Configuration
JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_CHANGE_THIS
JWT_EXPIRES_IN=7d

# AI/LLM Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-sonnet-20240229
LLM_PROVIDER=anthropic

# Telegram Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# WebSocket Configuration
WEBSOCKET_PORT=5001

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=https://yourdomain.com

# Logging
LOG_LEVEL=info

# QR Code Configuration
QR_CODE_BASE_URL=https://yourdomain.com/chat
```

#### Frontend Environment (.env.local)

```bash
cd frontend
cp .env.local.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
```

#### Docker Environment (.env)

For Docker deployment, create `.env` in the root directory:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

## Database Setup

### Option 1: Manual PostgreSQL Setup

1. **Install PostgreSQL 15+**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15

# macOS
brew install postgresql@15

# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql@15  # macOS
```

2. **Create Database**

```bash
sudo -u postgres psql

CREATE DATABASE hospitality_ai;
CREATE USER hospitality_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE hospitality_ai TO hospitality_user;
\q
```

3. **Run Migrations**

```bash
cd backend
npm install
psql -U hospitality_user -d hospitality_ai -f migrations/001_initial_schema.sql
```

### Option 2: Docker PostgreSQL

PostgreSQL is included in `docker-compose.yml`. It will be automatically set up when you run Docker.

## Backend Deployment

### Option 1: Manual Deployment

1. **Install Dependencies**

```bash
cd backend
npm install
```

2. **Build TypeScript**

```bash
npm run build
```

3. **Start Production Server**

```bash
npm start
```

4. **Use Process Manager (Recommended)**

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.js --name hospitality-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

See [Docker Deployment](#docker-deployment) section below.

## Frontend Deployment

### Option 1: Manual Deployment

1. **Install Dependencies**

```bash
cd frontend
npm install
```

2. **Build Production**

```bash
npm run build
```

3. **Start Production Server**

```bash
npm start
```

### Option 2: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Follow prompts and set environment variables in Vercel dashboard
```

### Option 3: Deploy to Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Add environment variables in Netlify dashboard

## Docker Deployment

### Development Mode

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Mode

1. **Update docker-compose.yml for production**

Change environment variables:
- Set `NODE_ENV=production`
- Update database passwords
- Update CORS_ORIGIN

2. **Build and start**

```bash
docker-compose up -d --build
```

3. **Initialize database**

```bash
docker-compose exec backend npm run migrate
```

## Configuration

### 1. Nginx Reverse Proxy (Recommended for Production)

Create `/etc/nginx/sites-available/hospitality-ai`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/hospitality-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com
```

### 3. Firewall Configuration

```bash
# Allow necessary ports
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

## Post-Deployment

### 1. Create Super Admin Account

The initial schema includes a default super admin account:
- Email: `admin@hospitalityai.com`
- Password: `Admin@123`

**IMPORTANT**: Change this password immediately after first login!

### 2. Verify Services

```bash
# Check backend health
curl http://localhost:5000/health

# Check database connection
docker-compose exec postgres psql -U postgres -c "SELECT NOW();"
```

### 3. Test Telegram Bot

1. Add the bot to a test group
2. Get the group chat ID:
   ```bash
   curl https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. Configure a department with the group ID
4. Test notifications from the Hotel Admin Portal

### 4. Monitor Logs

```bash
# Backend logs (PM2)
pm2 logs hospitality-backend

# Backend logs (Docker)
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres
```

### 5. Database Backup Setup

Create backup script `/opt/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/hospitality-ai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker-compose exec -T postgres pg_dump -U postgres hospitality_ai | gzip > $BACKUP_DIR/db_backup_$TIMESTAMP.sql.gz

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete
```

Add to crontab:

```bash
crontab -e
# Add: 0 2 * * * /opt/scripts/backup-db.sh
```

## Troubleshooting

### Backend Issues

**Issue**: Database connection failed

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
psql -U postgres -h localhost -p 5432 -d hospitality_ai
```

**Issue**: Port already in use

```bash
# Find process using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>
```

### Frontend Issues

**Issue**: API connection refused

- Check NEXT_PUBLIC_API_URL in frontend/.env.local
- Verify backend is running
- Check CORS settings in backend

**Issue**: Build fails

```bash
# Clear cache and rebuild
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### Docker Issues

**Issue**: Container won't start

```bash
# View detailed logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

**Issue**: Database data loss

```bash
# Check volumes
docker volume ls

# Backup before removing
docker-compose exec postgres pg_dump -U postgres hospitality_ai > backup.sql
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create additional indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_tasks_hotel_status ON tasks(hotel_id, status) WHERE hotel_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_messages_session_created ON messages(guest_session_id, created_at DESC);

-- Analyze tables
ANALYZE tasks;
ANALYZE messages;
ANALYZE guest_sessions;
```

### 2. Redis Caching (Optional)

The docker-compose includes Redis. To use it:

1. Install redis client: `npm install redis`
2. Configure caching in backend/src/config/redis.ts
3. Cache frequently accessed data (hotels, departments, knowledge base)

### 3. CDN for Frontend

Deploy frontend assets to CDN:
- Vercel (automatic)
- Cloudflare Pages
- AWS CloudFront

## Security Checklist

- [ ] Change default super admin password
- [ ] Use strong JWT secret (minimum 32 characters)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Regular security updates
- [ ] Database backups automated
- [ ] Environment variables secured
- [ ] API keys rotated regularly
- [ ] Monitor access logs

## Monitoring

### Recommended Tools

1. **Application Monitoring**: PM2, New Relic, or Datadog
2. **Server Monitoring**: Netdata, Prometheus + Grafana
3. **Error Tracking**: Sentry
4. **Uptime Monitoring**: UptimeRobot, Pingdom

### Health Checks

Set up health check endpoints monitoring:
- Backend: `https://api.yourdomain.com/health`
- Database: Check connection in application logs

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or HAProxy
2. **Multiple Backend Instances**: Run multiple backend containers
3. **Database Replication**: Set up PostgreSQL read replicas

### Vertical Scaling

Increase resources for Docker containers in docker-compose.yml:

```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

## Support

For issues and questions:
- Check logs first
- Review this guide
- Consult the main README.md
- Check backend API documentation at `/api/v1`

---

**Important Notes:**
- Always test changes in a staging environment first
- Keep backups before major updates
- Monitor system resources regularly
- Update dependencies regularly for security patches
