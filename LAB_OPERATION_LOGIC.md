# Arena Operations & Lab Matchmaking System Documentation

> **Note:** For information about deprecated code patterns and architecture considerations, see [CODE_ARCHITECTURE_NOTES.md](./CODE_ARCHITECTURE_NOTES.md)

## Overview

This document provides a comprehensive explanation of the arena operations and lab matchmaking system, including file structure, database design, and the flow of operations. This will help understand how all components work together to create the real-time matchmaking and lab session experience.

## File Structure

### Core Components

1. **Arena Page**
   - **File**: `src/pages/operations/ArenaPage.tsx`
   - **Purpose**: Main interface for matchmaking, viewing available users, sending/accepting invites
   - **Key Features**: Real-time updates, invitation handling, session creation

2. **Lab Interface Page**
   - **File**: `src/pages/redvsblue/LabInterfacePage.tsx`
   - **Purpose**: Interface for the actual lab session after matchmaking
   - **Key Features**: Team-specific content, chat, timer, questions/answers

3. **Operations Hook**
   - **File**: `src/hooks/useOperations.ts`
   - **Purpose**: Business logic for arena operations, handling invitations, accepting/declining
   - **Key Features**: Database operations, session creation, invitation management

4. **Session Redirect Page**
   - **File**: `src/pages/operations/OperationSessionPage.tsx`
   - **Purpose**: Handles redirections between matchmaking and lab interface
   - **Key Features**: Team detection, session validation, proper redirection

### Supporting Components

1. **Question Card Component**
   - **File**: `src/redvsblue/components/QuestionCard.tsx`
   - **Purpose**: Displays and handles question/answer interaction in lab sessions

2. **Auth Context**
   - **File**: `src/contexts/AuthContext.tsx`
   - **Purpose**: Manages user authentication throughout the app

3. **Database Migrations**
   - **Directory**: `supabase/migrations/`
   - **Purpose**: Database schema definition and updates
   - **Key Files**:
     - `20250823121000_create_lab_sessions.sql`: Creates lab_sessions table
     - `20250823123000_create_lab_session_chat.sql`: Creates chat functionality
     - `20250914000002_fix_lab_sessions_fk_fixed.sql`: Fixes foreign key constraints
     - `20250914000003_ensure_lab_tables_fixed.sql`: Ensures necessary tables exist
     - `20250914000004_create_safe_lab_session_function.sql`: Adds safe session creation

## Database Schema

### Match Requests Table
```sql
CREATE TABLE match_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  username text,
  lab_id uuid NOT NULL,
  team text NOT NULL, -- 'Red' or 'Blue'
  status text NOT NULL DEFAULT 'waiting', -- 'waiting', 'invited', 'matched', 'declined'
  partner_id uuid REFERENCES auth.users(id),
  partner_username text,
  session_id uuid REFERENCES lab_sessions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Lab Sessions Table
```sql
CREATE TABLE lab_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_id uuid NOT NULL,
  red_user_id uuid NOT NULL,
  blue_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active',
  vm_details jsonb,
  red_questions jsonb,
  blue_questions jsonb,
  time_remaining integer DEFAULT 3600,
  ends_at timestamptz DEFAULT (now() + interval '1 hour'),
  request_id uuid,
  session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Lab Session Chat Table
```sql
CREATE TABLE lab_session_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES lab_sessions(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  username text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Labs Table
```sql
CREATE TABLE labs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
```

### New_operation Table
```sql
CREATE TABLE New_operation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
```

## Operation Flow

### 1. Arena Matchmaking Process

1. **Initial Arena Request**
   - User enters the Arena page (`ArenaPage.tsx`)
   - User selects a team (Red/Blue) and a lab
   - `handleJoinArena()` creates a new match_request with status='waiting'

2. **Finding Partners**
   - Arena page displays other users in waiting status
   - Filters users by team preference (Red team users see Blue team waiters, vice versa)
   - User can invite another user with `handleInviteUser()`

3. **Sending Invitations**
   - `useOperations.ts` handles invitation logic with `sendInvite()`
   - Updates match_request with partner details and status='invited'
   - Creates a notification for the invitee

4. **Receiving Invitations**
   - Real-time Supabase subscription detects invitation
   - Shows invitation card in the UI
   - User can accept or decline with `handleAcceptInvite()` or `handleDeclineInvite()`

### 2. Creating a Lab Session

1. **Accepting an Invite**
   - `acceptInvite()` in `useOperations.ts` processes acceptance
   - Validates lab existence in either `labs` or `New_operation` tables
   - Creates a new lab_sessions record with both users' IDs and lab details

2. **Session Creation Methods**
   - **Direct Insert**: First tries to insert directly into lab_sessions table
   - **RPC Method**: If direct insert fails, tries the secure RPC function
   - **Fallback Logic**: Multiple approaches to ensure successful session creation

3. **Post-Creation Actions**
   - Updates match_request to status='matched' with session_id
   - Creates notification for the original requester
   - Redirects both users to the lab interface

### 3. Lab Session Interface

1. **Entering the Lab**
   - Two paths to enter:
     - **Automatic**: Real-time subscription detects new session and redirects
     - **Manual**: User clicks "Enter Session" button on Arena page

2. **Session Details Fetching**
   - `LabInterfacePage.tsx` loads lab details from `labs` or `New_operation` tables
   - Loads session information to determine team roles
   - Sets up real-time chat and session monitoring

3. **Team-Specific Content**
   - Displays different content based on team (Red/Blue)
   - Shows appropriate instructions and questions
   - Visual styling changes based on team

4. **Session Management**
   - Timer countdown for session duration
   - Chat functionality between partners
   - Question answering and scoring
   - Session abandonment handling when a user leaves

## Database Operations

### Key RPC Functions

1. **create_lab_session_safe**
   ```sql
   CREATE OR REPLACE FUNCTION create_lab_session_safe(
     red_id uuid, blue_id uuid, lab_id uuid, request_id uuid DEFAULT NULL
   ) RETURNS uuid
   ```
   - Validates lab existence before creating a session
   - Creates session with all necessary fields
   - Updates the match request to 'matched' status

2. **validate_lab_id**
   ```sql
   CREATE OR REPLACE FUNCTION validate_lab_id() RETURNS TRIGGER
   ```
   - Trigger function that runs before lab_sessions inserts/updates
   - Checks if lab_id exists in either labs or New_operation tables
   - Prevents invalid lab references

### Real-time Subscriptions

1. **Session Creation**
   ```typescript
   supabase
     .channel('arena-updates-' + user.id)
     .on('postgres_changes', 
       { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'lab_sessions',
         filter: `red_user_id=eq.${user.id}` 
       }, 
       (payload) => {
         // Redirect to red team interface
       }
     )
   ```

2. **Match Request Updates**
   ```typescript
   supabase
     .channel('arena-updates-' + user.id)
     .on('postgres_changes',
       {
         event: 'UPDATE',
         schema: 'public',
         table: 'match_requests',
         filter: `partner_id=eq.${user.id}`
       },
       () => {
         // Reload requests to update UI
       }
     )
   ```

3. **Chat Messages**
   ```typescript
   supabase
     .channel('lab_session_chat:' + sessionId)
     .on('postgres_changes', 
       { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'lab_session_chat', 
         filter: `session_id=eq.${sessionId}` 
       }, 
       (payload) => {
         // Update chat messages
       }
     )
   ```

## Error Handling & Resilience

### Multi-step Validation

1. **Team Validation**
   - Team parameter from URL is normalized and validated
   - Session data provides fallback team determination
   - Logging of team determination process

2. **Lab Existence Checks**
   - Tries multiple tables (New_operation, labs)
   - Fallback content when lab fields are missing
   - Descriptive error messages for debugging

3. **Session Creation Retries**
   - Multiple approaches to create sessions
   - Direct database operations as fallback
   - RPC functions for secure operations

### UI Fallbacks

1. **Manual Session Entry**
   - "Enter Session" button for when automatic redirection fails
   - Active sessions list on Arena page
   - Team determination from session data

2. **Content Fallbacks**
   - Default descriptions when specific fields are missing
   - Placeholder UI when questions aren't available
   - Graceful degradation of features

3. **Error States**
   - Clear error messages with debug information
   - Return to Arena buttons when errors occur
   - Session abandonment handling

## Debugging Techniques

1. **Console Logging Strategy**
   - Key process steps are logged
   - Important data state changes are tracked
   - Error conditions have detailed logging

2. **UI Debug Information**
   - Critical state variables shown in debug panels
   - Team and session IDs displayed for troubleshooting
   - Lab ID and connection parameters visible

3. **Database Validation**
   - SQL migrations include proper error handling
   - Trigger functions validate data integrity
   - Foreign key constraints ensure data consistency

## Conclusion

The arena operations and lab matchmaking system provides a robust framework for connecting users in real-time collaboration sessions. The multi-layered approach to session creation, team assignment, and content delivery ensures reliability even when individual components encounter issues.

By understanding the file structure, database schema, and operational flow described in this document, you can effectively maintain and extend the system while troubleshooting any issues that arise.
