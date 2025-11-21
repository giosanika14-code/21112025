# პრობლემების გადაწყვეტა / Troubleshooting

## პრობლემა: ავტორიზაცია ვერ მუშაობს / Login Not Working

### სიმპტომი:
- Console-ში ჩანს: `POST http://localhost:5001/api/v1/auth/login 401 (Unauthorized)`
- ან: `POST http://localhost:5002/api/v1/auth/login ...`

### მიზეზი:
ბრაუზერის cache-ში შენახული ძველი JavaScript კოდი, რომელიც იყენებს არასწორ API პორტს.

### გადაწყვეტა:

#### 1. Hard Refresh (ყველაზე მარტივი)
გახსენით login გვერდი და დააჭირეთ:
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

#### 2. Incognito Mode (რეკომენდებული)
გახსენით ახალი Incognito/Private window:
- **Chrome/Edge**: `Ctrl + Shift + N` (Windows/Linux) ან `Cmd + Shift + N` (Mac)
- **Firefox**: `Ctrl + Shift + P` (Windows/Linux) ან `Cmd + Shift + P` (Mac)
- **Safari**: `Cmd + Shift + N` (Mac)

შემდეგ გადადით: http://localhost:3000/login

#### 3. Clear Browser Cache
1. გახსენით Developer Tools: `F12` ან `Ctrl+Shift+I`
2. დააჭირეთ `Network` tab-ს
3. დააჭირეთ მარჯვენა ღილაკს Refresh ღილაკზე
4. აირჩიეთ "Empty Cache and Hard Reload"

---

## სისტემის გაშვება / Starting the System

### ავტომატური გაშვება (რეკომენდებული):

```bash
cd /home/user/21112025
./start-all.sh
```

ეს script-ი ავტომატურად გაუშვებს:
- ✅ PostgreSQL Database
- ✅ Backend API Server (port 5000)
- ✅ Frontend Web Server (port 3000)

### Manual გაშვება:

#### 1. PostgreSQL:
```bash
service postgresql start
pg_isready  # შემოწმება
```

#### 2. Backend:
```bash
cd /home/user/21112025/backend
npm run dev
```

მოითმინეთ სანამ დაინახავთ:
```
✅ Database connected successfully
🚀 Server running on port 5000
```

#### 3. Frontend (სხვა terminal-ში):
```bash
cd /home/user/21112025/frontend
npm run dev
```

მოითმინეთ სანამ დაინახავთ:
```
✓ Ready in X.Xs
```

---

## ავტორიზაციის Credentials

**Super Admin:**
- Email: `admin@hospitalityai.com`
- Password: `Admin@123`

---

## სერვისების შემოწმება / Service Health Check

### Backend:
```bash
curl http://localhost:5000/health
```

Expected output:
```json
{"status":"ok","timestamp":"...","uptime":...}
```

### Test Login:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospitalityai.com","password":"Admin@123"}'
```

Expected output:
```json
{"success":true,"data":{"token":"...","user":{...}}}
```

### Frontend:
გახსენით ბრაუზერში: http://localhost:3000

---

## გავრცელებული შეცდომები / Common Errors

### Error: "ECONNREFUSED 127.0.0.1:5432"
**მიზეზი**: PostgreSQL არ მუშაობს

**გადაწყვეტა**:
```bash
service postgresql start
```

### Error: "CORS policy"
**მიზეზი**: Backend არ მუშაობს ან არასწორ პორტზე მუშაობს

**გადაწყვეტა**:
1. შეამოწმეთ Backend მუშაობს თუ არა: `curl http://localhost:5000/health`
2. თუ არ მუშაობს, გაუშვით Backend: `cd backend && npm run dev`

### Error: "Module not found"
**მიზეზი**: Dependencies არ არის დაინსტალირებული

**გადაწყვეტა**:
```bash
# Backend
cd /home/user/21112025/backend
npm install

# Frontend
cd /home/user/21112025/frontend
npm install
```

---

## კონფიგურაციის ფაილები / Configuration Files

### Backend: `/home/user/21112025/backend/.env`
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospitality_ai
DB_USER=postgres
DB_PASSWORD=
CORS_ORIGIN=http://localhost:3000
```

### Frontend: `/home/user/21112025/frontend/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

⚠️ **მნიშვნელოვანი**: თუ ამ ფაილებს შეცვლით, გადატვირთეთ შესაბამისი სერვისები!

---

## სერვისების გათიშვა / Stopping Services

### ყველა Node.js პროცესის გათიშვა:
```bash
pkill -f "node"
pkill -f "tsx"
pkill -f "next"
```

### PostgreSQL-ის გათიშვა:
```bash
service postgresql stop
```

---

## დამატებითი დახმარება / Additional Help

თუ პრობლემა გრძელდება:

1. შეამოწმეთ Logs:
   ```bash
   # Backend logs (თუ start-all.sh გამოიყენეთ)
   tail -f /tmp/backend.log

   # Frontend logs
   tail -f /tmp/frontend.log
   ```

2. გადატვირთეთ ყველა სერვისი:
   ```bash
   pkill -f "node"
   service postgresql restart
   sleep 3
   ./start-all.sh
   ```

3. დაამატეთ Browser Developer Console-ში logging:
   - გახსენით Developer Tools (`F12`)
   - გადადით `Console` tab-ზე
   - ნახეთ რა შეცდომები ჩანს

---

## პორტების შემოწმება / Check Ports

```bash
# რა პროცესები იყენებენ პორტებს:
lsof -ti:5000  # Backend
lsof -ti:3000  # Frontend
lsof -ti:5432  # PostgreSQL

# პორტის გათავისუფლება:
kill -9 $(lsof -ti:5000)
```
