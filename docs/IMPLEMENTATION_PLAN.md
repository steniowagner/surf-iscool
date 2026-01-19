# Surf-IsCool Implementation Plan

This document outlines the complete implementation plan for the Surf-IsCool platform - a cross-platform mobile application for managing surf and skate lectures between instructors and students.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technical Architecture](#technical-architecture)
3. [User Roles](#user-roles)
4. [Implementation Phases](#implementation-phases)
   - [Phase 1: Core User Management](#phase-1-core-user-management)
   - [Phase 2: Class/Schedule System](#phase-2-classschedule-system)
   - [Phase 3: Booking System](#phase-3-booking-system)
   - [Phase 4: Instructor Features](#phase-4-instructor-features)
   - [Phase 5: Notifications & Communication](#phase-5-notifications--communication)
   - [Phase 6: Analytics & Reporting](#phase-6-analytics--reporting)
5. [Data Models](#data-models)
6. [API Endpoints Summary](#api-endpoints-summary)

---

## Project Overview

Surf-IsCool is a scheduling platform that enables:
- **Admins** to manage schedules, users, and system configurations
- **Instructors** to view and monitor their assigned lectures
- **Students** to browse, request enrollment, and manage their class participation

### Key Features
- Social login (Google, Facebook, Apple) and email/password authentication via Supabase
- Admin approval workflow for new users
- Class scheduling with instructor assignments
- Student enrollment with approval workflow
- Cancellation rules management
- Push notifications for class updates
- Rating and feedback system
- Photo uploads for completed classes
- Analytics dashboard

---

## Technical Architecture

### Monorepo Structure
```
surf-iscool/
├── apps/
│   ├── api/          # NestJS backend (Supabase PostgreSQL + Drizzle ORM)
│   ├── web/          # Next.js admin dashboard
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── types/        # Shared TypeScript enums and types
│   └── auth-client/  # Platform-agnostic Supabase auth SDK
└── docs/             # Documentation
```

### Technology Stack
- **Backend**: NestJS 11, Supabase (PostgreSQL + Auth), Drizzle ORM
- **Web**: Next.js 16, React 19, Tailwind CSS 4
- **Mobile**: Expo 54, React Native
- **Infrastructure**: Docker, Testcontainers (for E2E tests)

---

## User Roles

### Admin
- Full control over schedules, users, and system configurations
- Can create, edit, and delete weekly schedules
- Manages user registrations (approve/deny)
- Manages student enrollments (approve/deny)
- Can promote/demote users between roles
- Sends global notifications
- Manages cancellation rules
- Access to analytics dashboard

### Instructor
- View-only access to assigned lectures
- Receives notifications for:
  - Student join requests
  - Student cancellations
  - Lecture updates/cancellations
  - Student feedback and ratings
- Can upload photos to completed classes
- Cannot modify schedules or approve students

### Student
- Must be approved by admin before accessing the app
- Can view available lectures (current and past weeks)
- Can request to join lectures (pending admin approval)
- Can mark enrollment as "experimental" (beginner)
- Can cancel enrollment (subject to cancellation rules)
- Can rate lectures after completion
- Can upload photos to completed classes

---

## Implementation Phases

### Phase 1: Core User Management

**Status**: Complete

**Goal**: Establish the foundation for user authentication, authorization, and lifecycle management.

#### 1.1 User Registration & Authentication
- [x] Supabase Authentication integration
- [x] Email/password sign-up
- [x] Social login (Google, Facebook, Apple) - via Supabase
- [x] JWT token verification via Passport strategy

#### 1.2 User Status Workflow
```
                    ┌─────────────────────────────┐
                    │ PENDING_PROFILE_INFORMATION │
                    └─────────────┬───────────────┘
                                  │ (user completes profile)
                                  ▼
                    ┌─────────────────────────────┐
                    │     PENDING_APPROVAL        │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴───────────────┐
                    │                             │
                    ▼                             ▼
          ┌─────────────┐               ┌─────────────┐
          │   ACTIVE    │               │   DENIED    │
          └──────┬──────┘               └─────────────┘
                 │
                 │ (admin/self delete)
                 ▼
          ┌─────────────┐
          │   DELETED   │
          └──────┬──────┘
                 │ (admin reactivate)
                 ▼
          ┌─────────────────────────────┐
          │     PENDING_APPROVAL        │
          └─────────────────────────────┘
```

**User Statuses**:
- `PENDING_PROFILE_INFORMATION`: Initial state after Supabase auth
- `PENDING_APPROVAL`: Profile complete, awaiting admin approval
- `ACTIVE`: Approved and can use the platform
- `DENIED`: Registration denied by admin
- `DEACTIVATED`: Temporarily disabled
- `DELETED`: Soft-deleted account

#### 1.3 Admin User Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | List all users with filters (status, role) |
| POST | `/admin/users/:id/approve` | Approve a pending user |
| POST | `/admin/users/:id/deny` | Deny a pending user with optional reason |
| PATCH | `/admin/users/:id/role` | Change user role (Student ↔ Instructor) |
| DELETE | `/admin/users/:id` | Soft-delete a user |
| POST | `/admin/users/:id/reactivate` | Reactivate a deleted user |

#### 1.4 User Self-Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/me` | Get current user profile |
| PATCH | `/auth/me` | Update profile (name, phone, avatar) |
| DELETE | `/auth/me` | Delete own account (soft-delete) |

#### 1.5 Data Model Changes

**Users Table** - New audit fields:
```sql
approved_by     TEXT REFERENCES users(id)
approved_at     TIMESTAMP WITH TIME ZONE
denied_by       TEXT REFERENCES users(id)
denied_at       TIMESTAMP WITH TIME ZONE
denial_reason   TEXT
deleted_at      TIMESTAMP WITH TIME ZONE
```

**User Role History Table** - Audit trail for role changes:
```sql
CREATE TABLE user_role_history (
  id            UUID PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  previous_role user_role NOT NULL,
  new_role      user_role NOT NULL,
  changed_by    TEXT NOT NULL REFERENCES users(id),
  reason        TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### 1.6 Guards and Decorators
- `AuthGuard`: Validates Supabase JWT token
- `RolesGuard`: Checks user role against required roles
- `@Roles(UserRole.Admin)`: Decorator to specify required roles
- `@CurrentUser()`: Decorator to inject authenticated user

---

### Phase 2: Class/Schedule System

**Status**: Not Started

**Goal**: Enable admins to create and manage class schedules.

#### 2.1 Class Entity

**Attributes**:
- `id`: UUID
- `discipline`: Enum (SURF, SKATE)
- `skillLevel`: Enum (BEGINNER, ADVANCED, EXPERT) - informational only
- `scheduledAt`: DateTime (start time)
- `duration`: Integer (default 60 minutes)
- `location`: String
- `maxCapacity`: Integer
- `status`: Enum (SCHEDULED, CANCELLED, COMPLETED)
- `createdBy`: Reference to admin user
- `cancellationReason`: String (nullable)
- `createdAt`, `updatedAt`: Timestamps

#### 2.2 Class-Instructor Assignment

**Table: class_instructors**
```sql
CREATE TABLE class_instructors (
  id            UUID PRIMARY KEY,
  class_id      UUID NOT NULL REFERENCES classes(id),
  instructor_id TEXT NOT NULL REFERENCES users(id),
  assigned_by   TEXT NOT NULL REFERENCES users(id),
  assigned_at   TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(class_id, instructor_id)
);
```

#### 2.3 Admin Class Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/classes` | Create a new class |
| GET | `/admin/classes` | List all classes with filters |
| GET | `/admin/classes/:id` | Get class details |
| PATCH | `/admin/classes/:id` | Update class details |
| DELETE | `/admin/classes/:id` | Cancel a class |
| POST | `/admin/classes/:id/instructors` | Assign instructor(s) |
| DELETE | `/admin/classes/:id/instructors/:instructorId` | Remove instructor |

#### 2.4 Public Class Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/classes` | List available classes (current/past weeks) |
| GET | `/classes/:id` | Get class details with enrolled students |

#### 2.5 Business Rules
- Each class must have at least one instructor assigned
- Classes are exactly 1 hour long (configurable)
- Only SCHEDULED classes can be edited
- Cancelling a class triggers notifications to all enrolled students and instructors
- Past classes cannot be modified (except for photo uploads)

---

### Phase 3: Booking System

**Status**: Not Started

**Goal**: Enable students to request enrollment in classes and admins to manage those requests.

#### 3.1 Enrollment Entity

**Attributes**:
- `id`: UUID
- `classId`: Reference to class
- `studentId`: Reference to user
- `status`: Enum (PENDING, APPROVED, DENIED, CANCELLED)
- `isExperimental`: Boolean (marks beginner/trial)
- `requestedAt`: DateTime
- `reviewedBy`: Reference to admin (nullable)
- `reviewedAt`: DateTime (nullable)
- `denialReason`: String (nullable)
- `cancelledAt`: DateTime (nullable)
- `cancellationReason`: String (nullable)

#### 3.2 Enrollment Workflow
```
Student requests enrollment
          │
          ▼
    ┌───────────┐
    │  PENDING  │
    └─────┬─────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌────────┐  ┌────────┐
│APPROVED│  │ DENIED │
└────┬───┘  └────────┘
     │
     │ (student cancels)
     ▼
┌───────────┐
│ CANCELLED │
└───────────┘
```

#### 3.3 Cancellation Rules System

**Table: cancellation_rules**
```sql
CREATE TABLE cancellation_rules (
  id                    UUID PRIMARY KEY,
  name                  TEXT NOT NULL,
  hours_before_class    INTEGER NOT NULL,  -- e.g., 24 hours before
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_by            TEXT NOT NULL REFERENCES users(id),
  created_at            TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at            TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Business Logic**:
- Students can only cancel if current time is more than X hours before class start
- Admins can configure the cancellation window (e.g., 24 hours)
- Multiple rules can exist; the active rule is applied

#### 3.4 Enrollment Endpoints

**Student Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/classes/:id/enroll` | Request enrollment |
| DELETE | `/enrollments/:id` | Cancel enrollment |
| GET | `/my/enrollments` | List my enrollments with filters |

**Admin Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/enrollments` | List all enrollments with filters |
| POST | `/admin/enrollments/:id/approve` | Approve enrollment |
| POST | `/admin/enrollments/:id/deny` | Deny enrollment |
| GET | `/admin/cancellation-rules` | List cancellation rules |
| POST | `/admin/cancellation-rules` | Create cancellation rule |
| PATCH | `/admin/cancellation-rules/:id` | Update rule |
| DELETE | `/admin/cancellation-rules/:id` | Deactivate rule |

#### 3.5 Business Rules
- Students cannot enroll in full classes
- Students cannot enroll if not ACTIVE
- Students cannot have multiple pending/approved enrollments for the same class
- Cancellation is only allowed per the active cancellation rule
- When a class is cancelled, all enrollments are automatically cancelled

---

### Phase 4: Instructor Features

**Status**: Not Started

**Goal**: Provide instructors with tools to view and manage their assigned classes.

#### 4.1 Instructor Dashboard Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/instructor/classes` | List classes assigned to me |
| GET | `/instructor/classes/:id` | Get class details with enrolled students |
| GET | `/instructor/classes/upcoming` | List upcoming classes (next 7 days) |
| GET | `/instructor/classes/history` | List past classes |

#### 4.2 Photo Upload System

**Table: class_photos**
```sql
CREATE TABLE class_photos (
  id            UUID PRIMARY KEY,
  class_id      UUID NOT NULL REFERENCES classes(id),
  uploaded_by   TEXT NOT NULL REFERENCES users(id),
  url           TEXT NOT NULL,
  caption       TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL
);
```

**Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/classes/:id/photos` | Upload photo (instructor/student/admin) |
| GET | `/classes/:id/photos` | List photos for a class |
| DELETE | `/classes/:id/photos/:photoId` | Delete photo (owner or admin) |

**Business Rules**:
- Photos can only be uploaded to COMPLETED classes
- Students can only upload photos to classes they were enrolled in
- Instructors can only upload photos to classes they instructed
- Admins can upload/delete any photos

---

### Phase 5: Notifications & Communication

**Status**: Not Started

**Goal**: Implement push notifications and in-app notification system.

#### 5.1 Notification Types

| Type | Recipients | Trigger |
|------|------------|---------|
| `USER_APPROVED` | Student | Admin approves registration |
| `USER_DENIED` | Student | Admin denies registration |
| `ENROLLMENT_APPROVED` | Student | Admin approves enrollment |
| `ENROLLMENT_DENIED` | Student | Admin denies enrollment |
| `CLASS_UPDATED` | Enrolled students + Instructors | Class details changed |
| `CLASS_CANCELLED` | Enrolled students + Instructors | Class cancelled |
| `CLASS_REMINDER` | Enrolled students + Instructors | 30 min before class |
| `RATE_CLASS` | Students | 30 min after class ends |
| `INSTRUCTOR_ASSIGNED` | Instructor | Assigned to a class |
| `STUDENT_ENROLLED` | Instructors | New enrollment in their class |
| `STUDENT_CANCELLED` | Instructors | Student cancelled enrollment |
| `GLOBAL_ANNOUNCEMENT` | All users | Admin sends broadcast |

#### 5.2 Notification Entity

**Table: notifications**
```sql
CREATE TABLE notifications (
  id            UUID PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  type          notification_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  data          JSONB,  -- Additional payload (class_id, etc.)
  read_at       TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL
);
```

#### 5.3 Push Notification Infrastructure

**Table: user_devices**
```sql
CREATE TABLE user_devices (
  id            UUID PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  device_token  TEXT NOT NULL,
  platform      TEXT NOT NULL,  -- ios, android
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(user_id, device_token)
);
```

#### 5.4 Notification Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List my notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| POST | `/devices` | Register device for push |
| DELETE | `/devices/:token` | Unregister device |

**Admin Endpoints**:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/notifications/broadcast` | Send global announcement |

#### 5.5 Scheduled Jobs
- **Class Reminder Job**: Runs every 5 minutes, sends reminders for classes starting in 30 minutes
- **Rate Class Job**: Runs every 5 minutes, sends rating prompts for classes ended 30 minutes ago

---

### Phase 6: Analytics & Reporting

**Status**: Not Started

**Goal**: Provide admins with insights and metrics about platform usage.

#### 6.1 Dashboard Metrics

**User Metrics**:
- Total registered users (by role)
- New registrations (daily/weekly/monthly)
- Pending approvals count
- User status distribution

**Class Metrics**:
- Total classes (by discipline, status)
- Classes per week/month
- Average capacity utilization
- Cancellation rate

**Enrollment Metrics**:
- Total enrollments (by status)
- Approval rate
- Cancellation rate
- Experimental enrollments percentage

**Instructor Metrics**:
- Classes per instructor
- Average rating per instructor
- Most active instructors

#### 6.2 Rating System

**Table: class_ratings**
```sql
CREATE TABLE class_ratings (
  id            UUID PRIMARY KEY,
  class_id      UUID NOT NULL REFERENCES classes(id),
  student_id    TEXT NOT NULL REFERENCES users(id),
  rating        INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment       TEXT,
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE(class_id, student_id)
);
```

#### 6.3 Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/analytics/users` | User statistics |
| GET | `/admin/analytics/classes` | Class statistics |
| GET | `/admin/analytics/enrollments` | Enrollment statistics |
| GET | `/admin/analytics/instructors` | Instructor performance |
| GET | `/admin/analytics/ratings` | Rating summaries |

#### 6.4 Student Rating Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/classes/:id/rate` | Submit rating for completed class |
| GET | `/classes/:id/ratings` | Get ratings for a class |

---

## Data Models

### Entity Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│    users    │───────│ user_role_history│       │   classes   │
└─────────────┘       └──────────────────┘       └─────────────┘
      │                                                 │
      │                                                 │
      ├─────────────────────────────────────────────────┤
      │                                                 │
      ▼                                                 ▼
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│ enrollments │       │class_instructors │       │class_photos │
└─────────────┘       └──────────────────┘       └─────────────┘
                                                        │
                                                        ▼
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│notifications│       │  user_devices    │       │class_ratings│
└─────────────┘       └──────────────────┘       └─────────────┘

┌───────────────────┐
│cancellation_rules │
└───────────────────┘
```

### Enums

```typescript
// User Status
enum UserStatus {
  PendingProfileInformation = "PENDING_PROFILE_INFORMATION",
  PendingApproval = "PENDING_APPROVAL",
  Active = "ACTIVE",
  Denied = "DENIED",
  Deactivated = "DEACTIVATED",
  Deleted = "DELETED",
}

// User Role
enum UserRole {
  Student = "STUDENT",
  Instructor = "INSTRUCTOR",
  Admin = "ADMIN",
}

// Discipline
enum Discipline {
  Surf = "SURF",
  Skate = "SKATE",
}

// Skill Level
enum SkillLevel {
  Beginner = "BEGINNER",
  Advanced = "ADVANCED",
  Expert = "EXPERT",
}

// Class Status
enum ClassStatus {
  Scheduled = "SCHEDULED",
  Cancelled = "CANCELLED",
  Completed = "COMPLETED",
}

// Enrollment Status
enum EnrollmentStatus {
  Pending = "PENDING",
  Approved = "APPROVED",
  Denied = "DENIED",
  Cancelled = "CANCELLED",
}

// Notification Type
enum NotificationType {
  UserApproved = "USER_APPROVED",
  UserDenied = "USER_DENIED",
  EnrollmentApproved = "ENROLLMENT_APPROVED",
  EnrollmentDenied = "ENROLLMENT_DENIED",
  ClassUpdated = "CLASS_UPDATED",
  ClassCancelled = "CLASS_CANCELLED",
  ClassReminder = "CLASS_REMINDER",
  RateClass = "RATE_CLASS",
  InstructorAssigned = "INSTRUCTOR_ASSIGNED",
  StudentEnrolled = "STUDENT_ENROLLED",
  StudentCancelled = "STUDENT_CANCELLED",
  GlobalAnnouncement = "GLOBAL_ANNOUNCEMENT",
}
```

---

## API Endpoints Summary

### Authentication
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/auth/me` | Yes | Any | Get current user profile |
| PATCH | `/auth/me` | Yes | Any | Update profile |
| DELETE | `/auth/me` | Yes | Student, Instructor | Delete own account |

### Admin - User Management
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/admin/users` | Yes | Admin | List users |
| POST | `/admin/users/:id/approve` | Yes | Admin | Approve user |
| POST | `/admin/users/:id/deny` | Yes | Admin | Deny user |
| PATCH | `/admin/users/:id/role` | Yes | Admin | Change role |
| DELETE | `/admin/users/:id` | Yes | Admin | Delete user |
| POST | `/admin/users/:id/reactivate` | Yes | Admin | Reactivate user |

### Admin - Class Management
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/admin/classes` | Yes | Admin | Create class |
| GET | `/admin/classes` | Yes | Admin | List all classes |
| PATCH | `/admin/classes/:id` | Yes | Admin | Update class |
| DELETE | `/admin/classes/:id` | Yes | Admin | Cancel class |
| POST | `/admin/classes/:id/instructors` | Yes | Admin | Assign instructor |
| DELETE | `/admin/classes/:id/instructors/:id` | Yes | Admin | Remove instructor |

### Admin - Enrollment Management
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/admin/enrollments` | Yes | Admin | List enrollments |
| POST | `/admin/enrollments/:id/approve` | Yes | Admin | Approve enrollment |
| POST | `/admin/enrollments/:id/deny` | Yes | Admin | Deny enrollment |

### Admin - Cancellation Rules
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/admin/cancellation-rules` | Yes | Admin | List rules |
| POST | `/admin/cancellation-rules` | Yes | Admin | Create rule |
| PATCH | `/admin/cancellation-rules/:id` | Yes | Admin | Update rule |
| DELETE | `/admin/cancellation-rules/:id` | Yes | Admin | Delete rule |

### Admin - Analytics
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/admin/analytics/users` | Yes | Admin | User stats |
| GET | `/admin/analytics/classes` | Yes | Admin | Class stats |
| GET | `/admin/analytics/enrollments` | Yes | Admin | Enrollment stats |
| GET | `/admin/analytics/instructors` | Yes | Admin | Instructor stats |
| GET | `/admin/analytics/ratings` | Yes | Admin | Rating stats |

### Admin - Notifications
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/admin/notifications/broadcast` | Yes | Admin | Send broadcast |

### Classes (Public)
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/classes` | Yes | Any | List available classes |
| GET | `/classes/:id` | Yes | Any | Get class details |
| POST | `/classes/:id/enroll` | Yes | Student | Request enrollment |
| POST | `/classes/:id/photos` | Yes | Any | Upload photo |
| GET | `/classes/:id/photos` | Yes | Any | List photos |
| POST | `/classes/:id/rate` | Yes | Student | Submit rating |
| GET | `/classes/:id/ratings` | Yes | Any | Get ratings |

### Instructor
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/instructor/classes` | Yes | Instructor | My assigned classes |
| GET | `/instructor/classes/upcoming` | Yes | Instructor | Upcoming classes |
| GET | `/instructor/classes/history` | Yes | Instructor | Past classes |

### Student Enrollments
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/my/enrollments` | Yes | Student | My enrollments |
| DELETE | `/enrollments/:id` | Yes | Student | Cancel enrollment |

### Notifications
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| GET | `/notifications` | Yes | Any | List my notifications |
| PATCH | `/notifications/:id/read` | Yes | Any | Mark as read |
| PATCH | `/notifications/read-all` | Yes | Any | Mark all as read |

### Devices
| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/devices` | Yes | Any | Register device |
| DELETE | `/devices/:token` | Yes | Any | Unregister device |

---

## Testing Strategy

### Unit Tests
- Service layer business logic
- Repository methods
- Utility functions
- Guards and decorators

### Integration Tests
- Controller endpoints with mocked services
- Database operations with test database

### E2E Tests
- Full request/response cycles
- Uses testcontainers for PostgreSQL
- Tests authentication flows
- Tests authorization (role-based access)

### Test Coverage Goals
- Minimum 80% code coverage
- All critical paths tested
- All error scenarios tested

---

## Deployment Considerations

### Environment Variables
```
# Server
PORT=3000
NODE_ENV=dev|test|prod

# Database (Supabase PostgreSQL)
DATABASE_HOST=
DATABASE_PORT=5432
DATABASE_USERNAME=
DATABASE_PASSWORD=
DATABASE_NAME=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Push Notifications (Supabase or external service)
# Configure based on chosen push notification provider

# File Storage (Supabase Storage or S3/CloudFlare R2)
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_ENDPOINT=
```

### Database Migrations
- Use Drizzle migrations for schema changes
- Always generate migrations before deployment
- Test migrations in staging environment first

### Monitoring
- Application logs via Winston
- Error tracking (Sentry recommended)
- Performance monitoring (New Relic/DataDog recommended)

---

## Next Steps

1. **Complete Phase 1**: Implement core user management with Supabase Auth
2. **Begin Phase 2**: Design and implement class/schedule system
3. **Iterate**: Continue through phases, adjusting based on feedback

---

*Document Version: 2.0*
*Last Updated: January 2025*
