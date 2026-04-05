# Appifylab Task - Social Media Platform - Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Key Design Decisions](#key-design-decisions)
7. [Security Features](#security-features)
8. [Performance Optimizations](#performance-optimizations)
9. [Deployment](#deployment)

---

## 🎯 Project Overview

**Appifylab Task** is a full-stack social media platform that enables users to:
- Create and share posts with privacy controls
- Engage through comments and nested replies
- React to posts and comments with multiple reaction types
- Build social networks through a friend system
- Manage user profiles with image uploads
- View personalized feeds with pagination

The platform is built with modern technologies prioritizing **performance**, **security**, and **scalability**.

---

## 🏗️ Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                      │
│              TypeScript + Vite + Axios API Client           │
│                                                              │
│  - Feed & Post Management                                   │
│  - Comment & Reply System                                   │
│  - Likes & Reactions UI                                     │
│  - User Profiles & Friend Management                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│               Backend API (Laravel 10)                       │
│          Sanctum Token Authentication + Middleware          │
│                                                              │
│  Controllers:                                               │
│  ├─ AuthController         (Register, Login, Token Mgmt)     │
│  ├─ PostController         (CRUD, Feed, Privacy)            │
│  ├─ CommentController      (Comments, Replies)              │
│  ├─ LikeController         (Like Toggle, Reactions)         │
│  ├─ FriendController       (Requests, Search, Suggested)    │
│  └─ ProfileController      (Profile & Password Updates)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                   MySQL Database                            │
│                                                              │
│  - Normalized relational schema                             │
│  - Performance indexes on frequently queried columns        │
│  - Cascade deletes for referential integrity                │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Creating a Post

```
1. User submits post form (React frontend)
   ↓
2. Frontend validates and sends POST /api/posts with FormData
   ↓
3. Middleware verifies auth token (Sanctum)
   ↓
4. PostController::store() processes the request
   ├─ Validates input data
   ├─ Stores post and image (if provided)
   ├─ Loads relationships efficiently (eager loading)
   └─ Returns post with likes/comments metadata
   ↓
5. Frontend receives response and updates Feed UI
```

---

## 💻 Technology Stack

### Backend
- **Framework**: Laravel 10.10
- **Authentication**: Laravel Sanctum (Token-based)
- **Database**: MySQL 8.0+
- **Image Storage**: Local file system / Cloud (configured via `FILESYSTEM_DISK`)
- **Mail**: SMTP-based (configurable)
- **Rate Limiting**: Built-in Laravel throttle middleware
- **Logging**: Monolog

### Frontend
- **Framework**: React 19.2.0 with TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **HTTP Client**: Axios 1.13.2
- **Styling**: CSS Modules & Flexbox
- **State Management**: React Hooks (useState, useContext, useCallback)

### Development Tools
- **PHP**: 8.1+
- **Node.js**: 18+
- **Package Manager**: Composer (PHP), npm (JavaScript)
- **Testing**: PHPUnit (Backend), Jest (Frontend - configurable)

---

## 🗄️ Database Schema

### ER Diagram Overview

```
users (1) ──┬── (N) posts
            ├── (N) comments  
            ├── (N) likes
            ├── (N) sent_friend_requests
            └── (N) received_friend_requests

posts (1) ──┬── (N) comments
            └── (N) likes (polymorphic)

comments (1) ─┬── (N) replies (self-referential parent_id)
              └── (N) likes (polymorphic)

likes uses polymorphic morph to attach to both posts and comments
friends (junction table) - bidirectional friendships
```

### Table Definitions

#### `users`
```sql
id (PK)
name: VARCHAR(255)
email: VARCHAR(255) UNIQUE
password: VARCHAR(255) HASHED
profile_image: VARCHAR(255) NULLABLE -- Relative path to image
failed_login_attempts: INT DEFAULT 0
locked_until: TIMESTAMP NULLABLE
last_login_at: TIMESTAMP NULLABLE
password_reset_token: VARCHAR(255) NULLABLE
password_reset_token_expires_at: TIMESTAMP NULLABLE
created_at, updated_at
```

#### `posts`
```sql
id (PK)
user_id (FK → users.id) CASCADE
content: LONGTEXT NULLABLE
image: VARCHAR(255) NULLABLE
privacy: ENUM('public', 'private') DEFAULT 'public'
created_at, updated_at
```

**Indexes**: `user_id`, `privacy`, `created_at`, composite `(privacy, created_at)`

#### `comments`
```sql
id (PK)
user_id (FK → users.id) CASCADE
post_id (FK → posts.id) CASCADE
parent_id (FK → comments.id) NULLABLE CASCADE -- For nested replies
content: TEXT
image: VARCHAR(255) NULLABLE
created_at, updated_at
```

**Indexes**: `user_id`, `post_id`, `parent_id`, `created_at`, composite `(post_id, parent_id, created_at)`

#### `likes`
```sql
id (PK)
user_id (FK → users.id) CASCADE
likeable_id: UNSIGNED BIGINT
likeable_type: VARCHAR(255) -- 'App\Models\Post' or 'App\Models\Comment'
reaction_type: VARCHAR(255) DEFAULT 'like' -- Examples: 'like', 'love', 'haha', etc.
created_at, updated_at
```

**Polymorphic morph**: `likeable_id` + `likeable_type` identify the target

**Indexes**: `user_id`, composite `(likeable_type, likeable_id)`, composite `(user_id, likeable_type, reaction_type)`

#### `friend_requests`
```sql
id (PK)
sender_id (FK → users.id) CASCADE
receiver_id (FK → users.id) CASCADE
status: ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending'
created_at, updated_at
```

**Constraints**: UNIQUE `(sender_id, receiver_id)` - prevents duplicate requests

**Indexes**: `sender_id`, `receiver_id`, composite `(receiver_id, status)`

#### `friends`
```sql
id (PK)
user_id (FK → users.id) CASCADE
friend_id (FK → users.id) CASCADE
created_at, updated_at
```

**Constraints**: UNIQUE `(user_id, friend_id)` - prevents duplicate friendships

**Note**: One-directional in the table. Each friendship is recorded once (user_id → friend_id).

---

## 🔌 API Endpoints

### Authentication Endpoints

#### Register a New User
```
POST /api/register
Rate Limit: 5 requests/minute

Request Body:
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!"
}

Response (201 Created):
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "profile_image_url": null
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Validation:
- Email must be unique
- Password: min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
```

#### Login
```
POST /api/login
Rate Limit: 10 requests/minute

Request Body:
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}

Response (200 OK):
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john.doe@example.com",
    "profile_image_url": "https://..."
  },
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

Error Responses:
- 429 Locked: Account locked after 5 failed attempts (30 minutes)
- 401 Invalid: Invalid email or password
```

#### Get Current User
```
GET /api/user
Auth: Required (Bearer Token)

Response (200 OK):
{
  "id": 1,
  "name": "John Doe",
  "email": "john.doe@example.com",
  "profile_image": "avatars/user1.jpg",
  "profile_image_url": "https://...",
  "created_at": "2025-11-22T10:00:00Z"
}
```

#### Logout
```
POST /api/logout
Auth: Required

Response (200 OK):
{
  "message": "Logged out successfully",
  "token": "revoked"
}
```

#### Logout All Devices
```
POST /api/logout/all
Auth: Required

Response (200 OK):
{
  "message": "Logged out from all devices"
}
```

#### Refresh Token
```
POST /api/refresh
Auth: Required
Note: Current token expires in 24 hours

Response (200 OK):
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

---

### Posts Endpoints

#### Get Feed (Paginated)
```
GET /api/posts?page=1&per_page=20
Auth: Required

Query Parameters:
- page: Page number (default 1)
- per_page: Items per page (default 20, max 50)

Response (200 OK):
{
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "content": "Hello world!",
      "image_url": "https://...",
      "privacy": "public",
      "created_at": "2025-11-22T10:00:00Z",
      "is_liked": false,
      "current_reaction": null,
      "likes_count": 42,
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "comments": [
        {
          "id": 101,
          "content": "Nice post!",
          "user_id": 2,
          "parent_id": null,
          "created_at": "2025-11-22T11:00:00Z",
          "likes_count": 5,
          "is_liked": false,
          "user": { ... }
        }
      ]
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 20,
    "total": 100
  }
}

Feed Logic:
- Shows all public posts from all users
- Shows private posts only from the authenticated user
- Ordered by newest first
- Returns preview of comments (max 20) with max 10 replies each
```

#### Create Post
```
POST /api/posts
Auth: Required
Content-Type: multipart/form-data (if image present)

Request Body:
{
  "content": "My first post!",
  "image": <File>,          -- Optional
  "privacy": "public"       -- 'public' or 'private'
}

Response (201 Created):
{
  "message": "Post created successfully",
  "post": {
    "id": 100,
    "user_id": 1,
    "content": "My first post!",
    "image_url": "https://...",
    "privacy": "public",
    "created_at": "2025-11-22T12:00:00Z",
    "is_liked": false,
    "current_reaction": null,
    "likes_count": 0,
    "user": { ... }
  }
}
```

#### Get Post by ID
```
GET /api/posts/{post_id}
Auth: Required

Response (200 OK):
{
  "id": 1,
  "user_id": 1,
  "content": "Hello world!",
  "image_url": "https://...",
  "privacy": "public",
  "created_at": "2025-11-22T10:00:00Z",
  "is_liked": false,
  "current_reaction": null,
  "likes_count": 42,
  "user": { ... },
  "comments": [  -- All comments, no preview limit
    {
      "id": 101,
      "content": "Nice!",
      "replies": [
        {
          "id": 102,
          "parent_id": 101,
          "content": "Thanks!",
          ...
        }
      ],
      ...
    }
  ]
}

Authorization: 
- Private posts visible only to owner
- Returns 403 Forbidden if user cannot view
```

#### Update Post
```
PUT /api/posts/{post_id}
POST /api/posts/{post_id}  -- Also supported for FormData compatibility
Auth: Required
Authorization: Must be post owner

Request Body:
{
  "content": "Updated content",
  "image": <File>,          -- Optional, replaces old image
  "privacy": "private"
}

Response (200 OK):
{
  "message": "Post updated successfully",
  "post": { ... }
}
```

#### Delete Post
```
DELETE /api/posts/{post_id}
Auth: Required
Authorization: Must be post owner

Response (200 OK):
{
  "message": "Post deleted successfully"
}
```

---

### Comments Endpoints

#### Get Comments for Post
```
GET /api/posts/{post_id}/comments
Auth: Required

Response (200 OK):
[
  {
    "id": 101,
    "user_id": 2,
    "post_id": 1,
    "parent_id": null,
    "content": "Nice post!",
    "image_url": null,
    "created_at": "2025-11-22T11:00:00Z",
    "is_liked": false,
    "current_reaction": null,
    "likes_count": 5,
    "user": {
      "id": 2,
      "name": "Jane Doe",
      "email": "jane@example.com"
    },
    "replies": [
      {
        "id": 102,
        "parent_id": 101,
        "content": "Agreed!",
        "user": { ... },
        ...
      }
    ]
  }
]
```

#### Create Comment or Reply
```
POST /api/comments
Auth: Required

Request Body:
{
  "post_id": 1,
  "content": "Great post!",
  "image": <File>,          -- Optional
  "parent_id": null         -- Set to comment ID for replies
}

Response (201 Created):
{
  "message": "Comment created successfully",
  "comment": {
    "id": 103,
    "user_id": 1,
    "post_id": 1,
    "parent_id": null,
    "content": "Great post!",
    "image_url": null,
    "created_at": "2025-11-22T12:00:00Z",
    "is_liked": false,
    "likes_count": 0,
    "user": { ... }
  }
}
```

#### Update Comment
```
PUT /api/comments/{comment_id}
Auth: Required
Authorization: Must be comment owner

Request Body:
{
  "content": "Updated comment"
}

Response (200 OK):
{
  "message": "Comment updated successfully",
  "comment": { ... }
}
```

#### Delete Comment
```
DELETE /api/comments/{comment_id}
Auth: Required
Authorization: Must be comment owner

Response (200 OK):
{
  "message": "Comment deleted successfully"
}
```

---

### Likes & Reactions Endpoints

#### Toggle Like / Add Reaction
```
POST /api/likes/toggle
Auth: Required

Request Body:
{
  "likeable_type": "post",              -- 'post' or 'comment'
  "likeable_id": 1,
  "reaction_type": "like"               -- 'like', 'love', 'haha', etc.
}

Behavior:
- If user hasn't liked: Creates like with reaction_type
- If user has liked with same reaction: Removes like (unlike)
- If user has liked with different reaction: Updates reaction_type

Response (200 OK):
{
  "message": "Like toggled successfully",
  "is_liked": true,
  "current_reaction": "like",
  "likes_count": 43,
  "reactions": {
    "like": { "count": 35 },
    "love": { "count": 8 }
  },
  "likes": [
    {
      "id": 1,
      "reaction_type": "like",
      "user": {
        "id": 1,
        "name": "John Doe",
        "profile_image_url": "https://..."
      }
    },
    ...
  ]
}
```

#### Get Likes / Reactions
```
GET /api/likes?likeable_type=post&likeable_id=1
Auth: Required

Query Parameters:
- likeable_type: 'post' or 'comment'
- likeable_id: ID of the post or comment

Response (200 OK):
{
  "likes_count": 42,
  "likes": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "created_at": "2025-11-22T10:00:00Z"
    }
  ]
}
```

---

### Friend System Endpoints

#### Search Users
```
GET /api/friends/search?q=john
Auth: Required

Query Parameters:
- q: Search query (searches by name)

Response (200 OK):
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "profile_image_url": "https://..."
  }
]
```

#### Get Suggested People
```
GET /api/friends/suggested
Auth: Required

Returns random users excluding:
- The authenticated user
- Users already friended
- Users with pending friend requests

Response (200 OK):
[
  {
    "id": 3,
    "name": "Bob Smith",
    "email": "bob@example.com",
    "profile_image_url": "https://..."
  }
]
```

#### Send Friend Request
```
POST /api/friends/request
Auth: Required

Request Body:
{
  "receiver_id": 3
}

Response (201 Created):
{
  "message": "Friend request sent successfully"
}

Errors:
- 400 Bad Request: User already friend, pending request exists, or self-request
```

#### Accept Friend Request
```
POST /api/friends/request/{request_id}/accept
Auth: Required

Response (200 OK):
{
  "message": "Friend request accepted successfully"
}
```

#### Reject Friend Request
```
POST /api/friends/request/{request_id}/reject
Auth: Required

Response (200 OK):
{
  "message": "Friend request rejected successfully"
}
```

#### Get Friends List
```
GET /api/friends
Auth: Required

Response (200 OK):
[
  {
    "id": 2,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "profile_image_url": "https://..."
  }
]
```

#### Get Pending Requests
```
GET /api/friends/pending
Auth: Required

Response (200 OK):
[
  {
    "id": 5,
    "sender": {
      "id": 4,
      "name": "Alice Johnson",
      "email": "alice@example.com",
      "profile_image_url": "https://..."
    },
    "created_at": "2025-11-22T09:00:00Z"
  }
]
```

---

### Profile Endpoints

#### Update Profile
```
PUT /api/profile
POST /api/profile  -- Also supported for FormData
Auth: Required

Request Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "profile_image": <File>     -- Optional
}

Response (200 OK):
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "profile_image_url": "https://..."
  }
}
```

#### Update Password
```
PUT /api/profile/password
Auth: Required

Request Body:
{
  "current_password": "OldPass123!",
  "password": "NewPass456!",
  "password_confirmation": "NewPass456!"
}

Response (200 OK):
{
  "message": "Password updated successfully"
}

Validation:
- Same password strength requirements as registration
```

---

## 🎨 Key Design Decisions

### 1. **Polymorphic Likes**
**Decision**: Use Laravel's polymorphic relationships for the `likes` table.

**Why**: Allows same table to handle both post and comment likes without duplication. Extensible if other models need likes in the future.

**Implementation**:
```php
// Like model
class Like extends Model {
    public function likeable(): MorphTo {
        return $this->morphTo();
    }
}

// Post/Comment models
class Post extends Model {
    public function likes(): MorphMany {
        return $this->morphMany(Like::class, 'likeable');
    }
}
```

### 2. **Reaction Types as a String Field**
**Decision**: Store `reaction_type` as VARCHAR instead of separate table.

**Why**: Simpler queries, fewer joins, flexible for adding new reaction types without schema changes. Most applications don't need to enforce a fixed set of reactions.

**Trade-off**: Requires client-side validation of allowed reaction types.

### 3. **Nested Comments (Self-Referential)**
**Decision**: Use `parent_id` FK to comments table for replies.

**Why**: 
- Simple implementation
- Supports unlimited nesting depth
- Natural recursive queries for loading all replies
- Easy authorization (reply author must match parent owner, implicitly)

**Limitation**: Deep nesting in UI requires careful recursive component handling to avoid performance issues.

### 4. **Unidirectional Friendships**
**Decision**: Store each friendship once in the `friends` table (A→B only, not B→A).

**Why**: 
- Reduces data redundancy
- Reduces disk space
- Easier to enforce no-duplicates constraint

**Trade-off**: Friend lookup requires `OR` queries to check both directions.

```php
// Get all friends (both-directional)
public function allFriends() {
    return User::whereIn('id', function($query) {
        $query->select('friend_id')->from('friends')->where('user_id', $this->id);
    })->orWhereIn('id', function($query) {
        $query->select('user_id')->from('friends')->where('friend_id', $this->id);
    });
}
```

### 5. **Feed Preview with Comment Limits**
**Decision**: Return up to 20 comments with up to 10 replies each in feed, but all comments in post detail view.

**Why**: 
- Reduces payload size for feed (better performance)
- Still gives preview of engagement
- Full comments available in dedicated detail view

### 6. **Rate Limiting Strategy**
**Decision**: Different limits for different endpoints:
- Register: 5 requests/minute (prevent account enumeration)
- Login: 10 requests/minute (protect against brute force)
- Authenticated users: 60 requests/minute (general API limit)

**Implementation**: Laravel's `throttle` middleware.

### 7. **Account Lockout After Failed Logins**
**Decision**: Lock account for 30 minutes after 5 failed login attempts.

**Why**: Prevents brute-force password guessing attacks.

**Implementation**: Track `failed_login_attempts` and `locked_until` on users table.

### 8. **Password Reset Tokens**
**Decision**: Generate unique token with expiration timestamp.

**Why**: Token is short-lived, reduces security window if a reset link is leaked.

**Future Enhancement**: Implement email-based password reset flow (partial DB schema already supports it).

### 9. **Image Storage Strategy**
**Decision**: Store relative path in database, resolve full URL via accessor method.

**Why**: 
- Flexible storage backend (local, S3, etc. configured via `FILESYSTEM_DISK`)
- URLs are self-contained in request/response
- Easy migration between storage backends

### 10. **Eager Loading with Batch Queries**
**Decision**: Use Eloquent's `with()` to eagerly load relationships and batch queries where possible.

**Why**: Prevents N+1 query problems on feed page (high performance impact).

**Example**:
```php
$posts = Post::with([
    'user:id,name,email,profile_image',
    'likes' => function ($query) use ($user) {
        $query->where('likeable_type', Post::class)
              ->with(['user:id,name,profile_image']);
    },
    'comments.replies'
])->get();
```

---

## 🔒 Security Features

### Authentication & Authorization

1. **Token-Based Authentication (Laravel Sanctum)**
   - Each login generates unique API token
   - Token expires in 24 hours
   - Tokens can be revoked via logout
   - Supports logout from all devices

2. **Password Strength Requirements**
   - Minimum 8 characters
   - At least 1 uppercase letter
   - At least 1 lowercase letter
   - At least 1 digit
   - At least 1 special character (@$!%*#?&)

3. **Account Lockout Protection**
   - 5 failed login attempts trigger 30-minute lockout
   - Locked account cannot login (returns 429 Too Many Requests)
   - Lockout duration tracked via `locked_until` timestamp

4. **CORS (Cross-Origin Resource Sharing)**
   - Configured to allow frontend origin
   - Credentials allowed in cross-origin requests

5. **Authorization Policies**
   - Users can only edit/delete their own posts and comments
   - Private posts visible only to owner
   - Friend requests must include valid sender/receiver IDs
   - Account lockout managed via timestamp comparison

### Data Protection

1. **Password Hashing**
   - Uses bcrypt with salting (Laravel default)
   - Stored in database as hashed value
   - Never transmitted in plain text

2. **Database Constraints**
   - Foreign keys with cascade delete prevent orphaned records
   - Unique constraints on email, friendships, friend requests
   - Prevent invalid state transitions (e.g., duplicate friendships)

3. **Input Validation**
   - Server-side validation on all endpoints
   - Email format validation
   - Content length limits
   - Type validation (enums for privacy, status, reaction_type)

### API Security

1. **Rate Limiting**
   - Register: 5 req/min (prevents spam user creation)
   - Login: 10 req/min (brute force protection)
   - General auth: 60 req/min (abuse prevention)

2. **HTTPS Enforcement** (in production)
   - All API traffic encrypted
   - Tokens transmitted in Authorization header only

3. **CSRF Protection** (if using web routes)
   - API routes use token-based auth instead

---

## ⚡ Performance Optimizations

### 1. **Eager Loading**
All major queries use `with()` to load relationships upfront:
```php
$posts = Post::with('user', 'comments.user', 'likes.user')
    ->paginate();
```

### 2. **Selective Column Loading**
Specify only needed columns in `select()`:
```php
'user:id,name,email,profile_image'  // Exclude password, tokens, etc.
```

### 3. **Batch Queries**
Minimize N+1 problems with single queries that load all needed data:
```php
// Instead of: foreach($posts) { $post->likes()->count(); } (N queries)
// Use: Like::whereIn('likeable_id', $postIds)->count() (1 query)
```

### 4. **Database Indexes**
Strategic indexes on frequently queried columns:

| Table | Index | Reason |
|-------|-------|--------|
| posts | `(privacy, created_at)` | Feed queries filter by privacy AND order by created_at |
| posts | `(user_id, created_at)` | User's posts |
| comments | `(post_id, parent_id, created_at)` | Load comments/replies by post |
| likes | `(likeable_type, likeable_id)` | Find likes for a post/comment |
| likes | `(user_id, likeable_type, reaction_type)` | Check user's reactions |
| friends | `(user_id, friend_id)` | Check friendship relationship |
| friend_requests | `(receiver_id, status)` | Get pending requests for user |

### 5. **Pagination**
Feed endpoint paginates results (default 20, max 50 per page):
```php
$posts->paginate($perPage);
```

### 6. **Caching** (Recommended for Production)
Not currently implemented but recommended:
- Cache popular users' posts
- Cache suggested users (changes rarely)
- Cache user profiles

### 7. **Image Optimization**
Recommendations (not coded yet):
- Resize large images on upload
- Use WebP format
- Serve from CDN or cloud storage

---

## 🚀 Deployment

### Prerequisites
- **Server**: Linux (Ubuntu 20.04+) or similar
- **PHP**: 8.1+ with extensions: pdo_mysql, gd, tokenizer, xml, bcmath
- **MySQL**: 8.0+ or compatible database
- **Node.js**: 18+ (for frontend build)
- **Composer**: Latest version
- **npm**: Latest version included with Node.js

### Backend Deployment

#### 1. Prepare Server
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install PHP and extensions
sudo apt install -y php8.1 php8.1-fpm php8.1-mysql php8.1-gd \
  php8.1-tokenizer php8.1-xml php8.1-bcmath composer

# Install Nginx (or Apache)
sudo apt install -y nginx

# Install MySQL
sudo apt install -y mysql-server
```

#### 2. Clone & Setup Application
```bash
cd /var/www/
git clone <repository-url> appifylab
cd appifylab/Backend

# Install dependencies
composer install --no-dev --optimize-autoloader

# Setup environment
cp .env.example .env
php artisan key:generate

# Configure database in .env
# DB_HOST=localhost
# DB_DATABASE=appifylab
# DB_USERNAME=root
# DB_PASSWORD=***
```

#### 3. Database Setup
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE appifylab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
php artisan migrate --force

# Optional: Seed test data
php artisan db:seed --force
```

#### 4. Storage & Permissions
```bash
# Create storage directory for images
mkdir -p storage/app/public
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data /var/www/appifylab

# Create symbolic link for public access
php artisan storage:link
```

#### 5. Web Server Configuration

**Nginx** (`/etc/nginx/sites-available/appifylab`):
```nginx
server {
    listen 80;
    server_name api.example.com;
    root /var/www/appifylab/Backend/public;
    index index.php;

    # HTTPS redirect (recommended)
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;
    root /var/www/appifylab/Backend/public;
    index index.php;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
```

#### 6. Environment Configuration
**.env Production Settings**:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com

DB_HOST=localhost
DB_DATABASE=appifylab
DB_USERNAME=appifylab_user
DB_PASSWORD=strong_password_here

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=587
MAIL_USERNAME=***
MAIL_PASSWORD=***
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@example.com
```

### Frontend Deployment

#### 1. Build
```bash
cd /var/www/appifylab/frontend

# Install dependencies
npm install

# Build for production
VITE_API_BASE_URL=https://api.example.com npm run build
```

#### 2. Serve Static Files
Deploy `dist/` folder to your hosting:

**Using Nginx**:
```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    root /var/www/appifylab/frontend/dist;
    index index.html;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        try_files $uri $uri/ /index.html;  # SPA routing
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Using Deployment Script

The project includes `deploy.sh` for automated deployment:

```bash
chmod +x deploy.sh
./deploy.sh
```

**Note**: The script is designed for Hostinger/cPanel-based deployment using zip/unzip (as per user preferences).

### Monitoring & Maintenance

#### 1. Logs
```bash
# Laravel logs
tail -f /var/www/appifylab/Backend/storage/logs/laravel.log

# Nginx logs
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

#### 2. Database Backups
```bash
# Manual backup
mysqldump -u root -p appifylab > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated via cron
0 2 * * * mysqldump -u root -p*** appifylab | gzip > /backups/appifylab_$(date +\%Y\%m\%d).sql.gz
```

#### 3. Cache Clearing
```bash
# Clear application cache
php artisan cache:clear

# Clear config cache
php artisan config:clear

# Clear view cache
php artisan view:clear
```

---

## 📦 Environment Variables Reference

**Backend (.env)**:
```
APP_NAME=Appifylab
APP_ENV=local|production
APP_DEBUG=true|false
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=appifylab
DB_USERNAME=root
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:5173,example.com
SESSION_DOMAIN=localhost

FILESYSTEM_DISK=local|s3
```

**Frontend (.env / .env.local)**:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 🧪 Testing (Placeholder for Future)

Current project includes test structure but no tests are implemented yet.

### Recommended Testing Strategy

**Backend (PHPUnit)**:
- AuthController tests (register, login, lockout)
- PostController tests (CRUD, privacy, feed)
- CommentController tests (replies, nesting)
- LikeController tests (polymorphic likes)
- FriendController tests (requests, suggestions)

**Frontend (Jest/Vitest)**:
- Component tests (Feed, Post, Comment)
- Service layer tests (API mocking)
- Integration tests (user workflows)

### Run Tests
```bash
# Backend
php artisan test --filter="PostTest"

# Frontend
npm test
```

---

## 🙏 Conclusion

**Appifylab Task** demonstrates a production-ready social media platform with:
- ✅ Secure authentication and authorization
- ✅ Scalable, normalized database design
- ✅ Performance-optimized queries and indexing
- ✅ RESTful API with clear contracts
- ✅ Modern frontend with React
- ✅ Comprehensive error handling
- ✅ Rate limiting and abuse prevention

**Areas for Future Enhancement**:
- Automated testing (unit, integration, e2e)
- Real-time features (WebSockets for notifications)
- Search functionality with full-text indices
- Image optimization pipeline
- CDN integration for media
- API documentation (Swagger/OpenAPI)
- Analytics and monitoring (New Relic, Sentry)

---

**Last Updated**: April 6, 2026  
**Maintained By**: Development Team
