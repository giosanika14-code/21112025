#!/bin/bash

echo "🚀 Starting Hospitality AI Platform..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Start PostgreSQL
echo -e "${YELLOW}Starting PostgreSQL...${NC}"
service postgresql start
sleep 2

if pg_isready > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL started successfully${NC}"
else
    echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
    exit 1
fi

echo ""

# Start Backend
echo -e "${YELLOW}Starting Backend Server...${NC}"
cd /home/user/21112025/backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to initialize..."
for i in {1..20}; do
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend started successfully on port 5000${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${RED}❌ Backend failed to start${NC}"
        tail -20 /tmp/backend.log
        exit 1
    fi
    sleep 1
done

echo ""

# Start Frontend
echo -e "${YELLOW}Starting Frontend Server...${NC}"
cd /home/user/21112025/frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo "Waiting for frontend to initialize..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend started successfully on port 3000${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Frontend failed to start${NC}"
        tail -20 /tmp/frontend.log
        exit 1
    fi
    sleep 1
done

echo ""
echo "======================================"
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo "======================================"
echo ""
echo "📡 Backend API: http://localhost:5000"
echo "🌐 Frontend: http://localhost:3000"
echo "🗄️  PostgreSQL: localhost:5432"
echo ""
echo "🔑 Demo Credentials:"
echo "   Email: admin@hospitalityai.com"
echo "   Password: Admin@123"
echo ""
echo "📝 Logs:"
echo "   Backend: tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo ""
echo "Press Ctrl+C to stop monitoring logs..."
echo ""

# Monitor logs
tail -f /tmp/backend.log /tmp/frontend.log
