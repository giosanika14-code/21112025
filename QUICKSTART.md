# 🚀 Quick Start Guide - Hospitality AI Platform

Get the platform running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL 15+ running
- Anthropic API key
- Telegram Bot token

## Option 1: Docker (Easiest) 🐳

### 1. Set Up Environment

```bash
# Copy environment file
cp .env.example .env

# Edit .env and add:
# - ANTHROPIC_API_KEY=your_key_here
# - TELEGRAM_BOT_TOKEN=your_bot_token_here
nano .env
```

### 2. Start Everything

```bash
docker-compose up -d
```

### 3. Initialize Database

```bash
docker-compose exec postgres psql -U postgres -d hospitality_ai -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### 4. Access the Platform

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/v1

### 5. Login

```
Email: admin@hospitalityai.com
Password: Admin@123
```

⚠️ **IMPORTANT**: Change this password immediately!

---

## Option 2: Manual Setup (For Development) 💻

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment
cp .env.example .env

# Edit .env with your API keys and database credentials
nano .env

# Initialize database (if PostgreSQL is running)
psql -U postgres -d hospitality_ai -f migrations/001_initial_schema.sql

# Start backend
npm run dev
```

Backend will run on **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env.local.example .env.local

# Start frontend
npm run dev
```

Frontend will run on **http://localhost:3000**

---

## 🎯 First Steps After Login

### As Super Admin

1. **Create a Hotel**
   - Go to Admin Panel
   - Click "Add Hotel"
   - Fill in hotel details and GM credentials
   - Hotel and GM account created!

### As Hotel Admin (GM)

1. **Set Up Departments**
   - Go to "Departments"
   - Create departments (Housekeeping, Maintenance, etc.)
   - Add Telegram Group IDs for notifications

2. **Add Rooms**
   - Go to "Rooms"
   - Create rooms
   - QR codes are automatically generated!
   - Download and print QR codes

3. **Add Knowledge Base**
   - Go to "Knowledge Base"
   - Add hotel information (amenities, policies, etc.)
   - This helps the AI answer guest questions

4. **Add Staff**
   - Go to "Staff"
   - Create staff accounts
   - Assign to departments

### As Staff

1. **View Tasks**
   - Login to Staff Portal
   - See all tasks assigned to your department
   - Accept → Start → Complete workflow

### As Guest

1. **Scan QR Code**
   - Scan room QR code with phone
   - Chat opens automatically
   - Start chatting with AI Concierge!

---

## 🔧 Getting API Keys

### Anthropic Claude API

1. Go to https://console.anthropic.com/
2. Sign up/Login
3. Go to API Keys
4. Create new key
5. Copy and paste into `.env`

### Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Follow prompts to create bot
4. Copy bot token
5. Paste into `.env`

### Getting Telegram Group ID

1. Create a Telegram group
2. Add your bot to the group
3. Send a message in the group
4. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
5. Look for `"chat":{"id":-1001234567890}`
6. That negative number is your Group ID!

---

## 📱 Testing the Platform

### Test AI Concierge

1. Go to a room page in Hotel Admin
2. Click "View QR" on any room
3. Copy the QR code data or URL
4. Open http://localhost:3000/chat?qr=<qr_code_data>
5. Start chatting!

### Test Telegram Notifications

1. Create a department with Telegram Group ID
2. Click "Test Telegram" button
3. Check your Telegram group for test message

### Test Task Workflow

1. As guest, send a request (e.g., "Need extra towels")
2. AI creates task and sends to Telegram
3. Staff sees task in Staff Portal
4. Staff accepts → starts → completes
5. Guest gets notification
6. Guest rates the service

---

## 🎨 Platform URLs

| Portal | URL | Users |
|--------|-----|-------|
| Super Admin | http://localhost:3000/admin | Platform admins |
| Hotel Admin | http://localhost:3000/hotel-admin | Hotel GMs |
| Staff Portal | http://localhost:3000/staff | Hotel staff |
| Guest Chat | http://localhost:3000/chat?qr=<code> | Hotel guests |

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check if port 5000 is available
lsof -i :5000
```

### Frontend won't start

```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run dev
```

### Database connection error

```bash
# Check connection
psql -U postgres -h localhost

# Verify credentials in backend/.env match your PostgreSQL setup
```

### API calls failing

```bash
# Check backend is running
curl http://localhost:5000/health

# Check CORS settings in backend/.env
```

### Telegram not sending messages

- Verify bot token is correct
- Ensure bot is added to the group
- Make group ID is negative number (e.g., -1001234567890)
- Bot must be admin in the group

---

## 📊 Sample Data

### Creating Test Hotel

```sql
-- Run in psql
INSERT INTO hotels (id, name, address, phone, email, license_status)
VALUES (
  uuid_generate_v4(),
  'Test Hotel',
  '123 Main St',
  '+1234567890',
  'test@hotel.com',
  'active'
);
```

---

## 🔐 Security Checklist

Before going to production:

- [ ] Change default super admin password
- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Set up database backups
- [ ] Update all API keys
- [ ] Review CORS settings
- [ ] Enable rate limiting

---

## 🎓 Learning the Platform

### For Hotel Managers

1. Watch the dashboard update in real-time
2. Check analytics to see performance metrics
3. Review guest ratings regularly
4. Update knowledge base with seasonal info

### For Staff

1. Keep Staff Portal open during shift
2. Accept tasks quickly
3. Update status as you work
4. Complete tasks when done

### For Developers

1. Check `IMPLEMENTATION_STATUS.md` for architecture details
2. See `DEPLOYMENT_GUIDE.md` for production setup
3. API is RESTful and well-documented
4. WebSocket events are listed in `backend/src/types/index.ts`

---

## 💡 Tips & Best Practices

### Knowledge Base

- Add comprehensive hotel information
- Include common questions and answers
- Update seasonal information (pool hours, etc.)
- Add multiple languages if needed

### Departments

- Create all relevant departments upfront
- Set up Telegram groups for each
- Test notifications before going live

### QR Codes

- Print high-quality codes
- Place in visible locations
- Include brief instructions
- Laminate for durability

### Staff Training

- Show staff the task workflow
- Practice accepting/completing tasks
- Explain importance of quick responses
- Demonstrate rating system

---

## 📞 Need Help?

- **Documentation**: Check README.md and IMPLEMENTATION_STATUS.md
- **API Reference**: Visit /api/v1 endpoint
- **Issues**: Check the troubleshooting section above

---

## 🎉 You're Ready!

The platform is now running. Start by:

1. Creating your first hotel (Super Admin)
2. Setting up departments and rooms (Hotel Admin)
3. Adding staff members
4. Testing the guest chat flow
5. Monitoring analytics

**Happy hosting! 🏨**
