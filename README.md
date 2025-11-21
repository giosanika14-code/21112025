# Hospitality AI Assistant SaaS Platform 🏨

Cloud-based SaaS platform for 500+ hotels featuring AI-powered Virtual Concierge and Real-time Task Management.

## 🎯 Project Overview

A multi-tenant platform designed for the hospitality industry, enabling hotels to:
- Provide AI-powered guest assistance through a multilingual chatbot
- Manage real-time task assignments and tracking
- Monitor staff performance and guest satisfaction
- Streamline department operations

## 🏗️ Architecture

### Multi-Tenant Design
- Shared database with separate schema/partitioning
- Mandatory `hotel_id` filtering in all transactions
- Scalable to support 500+ hotels

### Tech Stack

**Backend:**
- Node.js with Express & TypeScript
- PostgreSQL with multi-tenant architecture
- WebSocket (Socket.io) for real-time updates
- JWT authentication with role-based access control
- LLM Integration (OpenAI/Anthropic Claude)
- Telegram Bot API

**Frontend:**
- Next.js 14 with TypeScript
- React with Server Components
- Tailwind CSS for styling
- Socket.io-client for real-time updates
- QR Code generation

## 📦 Project Structure

```
.
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── middleware/     # Auth, tenant isolation
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities
│   │   └── websocket/      # WebSocket handlers
│   ├── migrations/         # Database migrations
│   └── package.json
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities & API client
│   │   ├── hooks/         # Custom hooks
│   │   └── types/         # TypeScript types
│   └── package.json
│
├── docker-compose.yml      # Docker setup
└── README.md
```

## 🚀 Four Main Portals

### 1. Super Admin Panel
**Users:** Platform Administrators

**Features:**
- Hotel management (add/remove)
- GM account management
- Global licensing & billing monitoring

### 2. Hotel Admin Portal
**Users:** Hotel General Managers

**Features:**
- Hotel CMS/Knowledge Base
- Department management with Telegram Group ID binding
- Analytics (task status, completion time, guest ratings)
- Room management & QR code generation

### 3. Staff Task Portal
**Users:** Hotel Staff (by department)

**Features:**
- Mobile-first task management interface
- Task status workflow: New → Accepted → In Progress → Completed
- Real-time task notifications

### 4. AI Concierge Chat
**Users:** Hotel Guests

**Features:**
- QR code-based access (hotel + room identification)
- Multilingual chat interface
- FAQ responses
- Automatic task generation

## 🔄 Core Operational Flow

1. **Guest Request:** Guest scans unique room QR code and sends request
2. **AI Analysis:** LLM analyzes content and routes to appropriate department
3. **Task Creation:** Task automatically created in database
4. **Telegram Notification:** Real-time alert sent to department group
5. **Staff Processing:** Staff manages task through portal
6. **Status Updates:** Guest receives updates in chat via WebSocket
7. **Rating:** Upon completion, guest provides feedback

## 🎨 Design System

**Color Palette:**
- Primary: Deep Calming Blue (`#3F51B5`)
- Background: Light Blue-Gray (`#F0F2F5`)
- Accent: Muted Violet (`#9575CD`)

**Typography:**
- Font Family: 'Inter' (sans-serif)

**Style:**
- Clean, minimalist design
- Intuitive navigation
- Smooth animations for task updates

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Docker & Docker Compose
- Telegram Bot Token
- OpenAI API Key or Anthropic API Key

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd hospitality-ai-platform
```

2. **Set up environment variables:**
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

3. **Start with Docker:**
```bash
docker-compose up -d
```

4. **Run migrations:**
```bash
cd backend
npm run migrate
```

5. **Access the application:**
- Super Admin: http://localhost:3000/admin
- Hotel Admin: http://localhost:3000/hotel-admin
- Staff Portal: http://localhost:3000/staff
- Guest Chat: http://localhost:3000/chat?qr=<qr_code>

## 🔒 Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Mandatory tenant isolation (`hotel_id` filtering)
- SQL injection prevention
- XSS protection
- Rate limiting on all endpoints

## 📊 Database Schema

Key entities:
- `hotels` - Hotel information
- `users` - All user types (Super Admin, GM, Staff)
- `departments` - Hotel departments with Telegram group IDs
- `rooms` - Hotel rooms with unique QR codes
- `tasks` - Guest requests and task tracking
- `messages` - Chat history
- `ratings` - Guest feedback
- `knowledge_base` - Hotel-specific information for AI

## 🤖 AI Integration

The AI Concierge uses Large Language Models to:
- Understand guest requests in multiple languages
- Analyze content semantically (no keyword triggers)
- Route tasks to appropriate departments
- Provide contextual responses based on hotel knowledge base

## 📱 Telegram Integration

- Real-time task notifications to department groups
- Task details sent with room number and guest request
- Staff can track tasks via portal

## 📈 Analytics & Reporting

- Task completion times
- Staff performance metrics
- Guest satisfaction ratings
- Department-wise statistics
- Real-time dashboard

## 🔧 Development

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
cd backend
npm run migrate:create <migration_name>
npm run migrate
npm run migrate:rollback
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 🌐 Deployment

The platform is designed for cloud deployment with:
- Docker containers
- PostgreSQL database
- Redis for caching
- Load balancer for scaling

## 👥 Team Roles

- **GM (General Manager):** Validates functionality, defines operational flows
- **CTO/Backend Developer:** LLM integration, Telegram API, multi-tenant security
- **Frontend Developer:** 4 portals + chat UI/UX, QR code visualization

## 📝 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a proprietary project. For internal team contributions, please follow the development guidelines.

---

Built with ❤️ for the hospitality industry
