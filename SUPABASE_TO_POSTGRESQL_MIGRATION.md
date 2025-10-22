# Supabase to PostgreSQL Migration Guide

## 🔍 **Migration Complexity Assessment: MEDIUM-HIGH**

Based on analysis of your codebase, migrating from Supabase to PostgreSQL involves significant architectural changes due to deep integration with Supabase-specific features.

## 📊 **Current Supabase Dependencies**

### **Database Layer**
- **108 SQL migration files** - Complex schema with extensive RLS policies
- **50+ TypeScript files** importing Supabase client
- **3 Edge Functions** for billing operations
- **Realtime subscriptions** for live updates
- **Row Level Security (RLS)** policies throughout

### **Authentication System**
- Supabase Auth for user registration/login
- JWT token management
- Social auth providers (if enabled)
- Session management across multiple apps

### **Key Features Using Supabase**
1. **Authentication & Authorization** (AuthContext, admin roles)
2. **Real-time subscriptions** (operations, matchmaking, leaderboards)
3. **File storage** (if used for images/documents)
4. **Edge Functions** (billing webhooks, payment processing)
5. **Row Level Security** (data access control)
6. **Admin RPCs** (security definer functions)

## 🛠️ **Migration Strategy: 3-Phase Approach**

### **Phase 1: Database Migration (2-3 weeks)**

#### 1.1 Export Current Schema
```bash
# Export Supabase schema
supabase db dump --schema-only > schema.sql
supabase db dump --data-only > data.sql
```

#### 1.2 Set Up PostgreSQL
```bash
# Install PostgreSQL
# Create new database
createdb hackosquad_db

# Install required extensions
psql hackosquad_db -c "CREATE EXTENSION IF NOT EXISTS uuid-ossp;"
psql hackosquad_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

#### 1.3 Schema Conversion
- **Remove Supabase-specific features:**
  - `auth.users` references → custom `users` table
  - RLS policies → application-level permissions
  - `auth.uid()` → session-based user ID
  - SECURITY DEFINER functions → regular functions with auth checks

#### 1.4 Data Migration
```sql
-- Custom users table to replace auth.users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE,
  user_metadata JSONB DEFAULT '{}'::jsonb,
  app_metadata JSONB DEFAULT '{}'::jsonb
);

-- Update all foreign key references
ALTER TABLE profiles DROP CONSTRAINT profiles_id_fkey;
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey 
  FOREIGN KEY (id) REFERENCES users(id);
```

### **Phase 2: Application Layer Changes (3-4 weeks)**

#### 2.1 Replace Supabase Client
**Before:**
```typescript
import { supabase } from './supabase';
```

**After:**
```typescript
import { pgClient } from './postgresql';
// or
import { prisma } from './prisma'; // if using Prisma ORM
```

#### 2.2 Authentication Replacement Options

**Option A: Custom Auth with Express.js**
```typescript
// /api/auth/login
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function loginUser(email: string, password: string) {
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (isValid) {
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    return { success: true, token, user };
  }
  return { success: false, error: 'Invalid credentials' };
}
```

**Option B: NextAuth.js (Recommended)**
```typescript
// Better for existing React apps
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export default NextAuth({
  providers: [
    CredentialsProvider({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        // Custom auth logic
      }
    })
  ]
});
```

**Option C: Auth0 or Clerk**
- Managed authentication service
- Drop-in replacement for Supabase Auth
- Handles social logins, MFA, etc.

#### 2.3 Database Client Replacement

**Option A: Raw PostgreSQL Client**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'hackosquad_db',
  user: 'postgres',
  password: 'password'
});

export async function getChallenges() {
  const result = await pool.query('SELECT * FROM challenges WHERE status = $1', ['approved']);
  return result.rows;
}
```

**Option B: Prisma ORM (Recommended)**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getChallenges() {
  return await prisma.challenges.findMany({
    where: { status: 'approved' }
  });
}
```

#### 2.4 Real-time Updates Replacement

**Option A: Socket.io**
```typescript
// Server
import { Server } from 'socket.io';

io.on('connection', (socket) => {
  socket.on('join-leaderboard', () => {
    socket.join('leaderboard');
  });
});

// Client
import io from 'socket.io-client';
const socket = io('http://localhost:3001');
```

**Option B: Server-Sent Events (SSE)**
```typescript
// Simpler than WebSockets for one-way updates
app.get('/api/leaderboard/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  setInterval(() => {
    res.write(`data: ${JSON.stringify(leaderboardData)}\n\n`);
  }, 5000);
});
```

### **Phase 3: Infrastructure & Deployment (1-2 weeks)**

#### 3.1 Server Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: hackosquad_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://postgres:password@postgres:5432/hackosquad_db
      JWT_SECRET: your-secret-key
    ports:
      - "3001:3001"
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api
```

#### 3.2 Environment Variables Update
```env
# Replace Supabase vars with:
DATABASE_URL=postgres://user:password@localhost:5432/hackosquad_db
JWT_SECRET=your-super-secure-secret-key
REDIS_URL=redis://localhost:6379  # For caching/sessions
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

## 📝 **Step-by-Step Migration Process**

### **Week 1-2: Setup & Planning**
1. **Export Supabase data**
2. **Set up PostgreSQL locally**
3. **Convert schema** (remove RLS, update auth references)
4. **Set up new project structure**

### **Week 3-4: Database Layer**
1. **Migrate core tables** (users, profiles, challenges, labs)
2. **Convert admin functions** to regular SQL functions
3. **Implement custom auth tables**
4. **Test data integrity**

### **Week 5-6: Authentication**
1. **Implement chosen auth solution** (NextAuth/Auth0/custom)
2. **Update login/register pages**
3. **Migrate session management**
4. **Test user flows**

### **Week 7-8: API Layer**
1. **Create REST/GraphQL APIs** to replace Supabase client calls
2. **Update all data fetching** in React components
3. **Implement caching strategy**
4. **Replace real-time subscriptions**

### **Week 9-10: Testing & Optimization**
1. **Integration testing**
2. **Performance optimization**
3. **Security review**
4. **Deployment setup**

## 💰 **Cost & Complexity Considerations**

### **Development Time: 8-10 weeks**
- Database migration: 2-3 weeks
- Auth system: 2-3 weeks  
- API development: 3-4 weeks
- Testing & deployment: 1-2 weeks

### **Ongoing Maintenance**
- **Database management** (backups, scaling, monitoring)
- **Security updates** (auth, dependencies)
- **Infrastructure costs** (hosting, monitoring)

### **Team Requirements**
- **Backend developer** (PostgreSQL, Node.js/Express)
- **DevOps engineer** (deployment, infrastructure)
- **Full-stack developer** (frontend updates)

## 🚀 **Recommended Tech Stack**

### **Database & ORM**
- **PostgreSQL 15+** with connection pooling
- **Prisma ORM** for type-safe database access
- **Redis** for caching and sessions

### **Backend API**
- **Next.js API routes** or **Express.js**
- **NextAuth.js** for authentication
- **Socket.io** for real-time features

### **Frontend Changes**
- **React Query/TanStack Query** for data fetching
- **Zustand** or **Redux Toolkit** for state management
- **Socket.io-client** for real-time updates

### **Deployment**
- **Vercel** (Next.js apps)
- **Railway/Render** (PostgreSQL + API)
- **Docker** containers for consistency

## ⚠️ **Challenges & Risks**

### **High-Risk Areas**
1. **Data loss** during migration
2. **Auth session management** complexity
3. **Real-time features** performance degradation
4. **RLS policy conversion** to application logic

### **Mitigation Strategies**
1. **Comprehensive testing** on staging environment
2. **Gradual migration** (parallel systems temporarily)
3. **Rollback plan** with Supabase backup
4. **User communication** about potential downtime

## 📋 **Migration Checklist**

### **Pre-Migration**
- [ ] Full Supabase backup
- [ ] Document all current features
- [ ] Set up staging PostgreSQL environment
- [ ] Create migration scripts

### **During Migration**
- [ ] Export schema and data
- [ ] Convert auth system
- [ ] Update all API calls
- [ ] Implement real-time alternatives
- [ ] Test all user workflows

### **Post-Migration**
- [ ] Performance monitoring
- [ ] User acceptance testing
- [ ] Security audit
- [ ] Documentation updates
- [ ] Team training on new stack

## 💡 **Alternative: Gradual Migration**

If full migration seems too risky, consider a **gradual approach**:

1. **Keep Supabase Auth** but use PostgreSQL for data
2. **Migrate by feature area** (billing first, then core features)
3. **Use Supabase REST API** as interim step before full migration
4. **Proxy pattern** to gradually route requests to new backend

## 🎯 **Conclusion**

**Migration Difficulty: 7/10**
- Significant but manageable with proper planning
- 8-10 weeks development time
- Requires full-stack expertise
- High reward: Better control, scalability, cost management

**Recommendation**: 
- If budget allows, consider **Auth0 + Prisma + PostgreSQL**
- Use **Next.js** for simplified deployment
- Plan for **gradual rollout** to minimize risk

This migration will give you complete control over your stack while eliminating Supabase dependency, but requires substantial development effort and careful execution.