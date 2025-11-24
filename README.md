# Appifylab Task - Social Media Platform

A full-stack social media platform built with **Laravel 10** (Backend) and **React 19 with TypeScript** (Frontend).

## 🚀 Quick Start

### Prerequisites
- PHP 8.1+
- Composer
- Node.js 18+
- MySQL/PostgreSQL

### Backend Setup

```bash
cd Backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```

### Frontend Setup

```bash
cd frontend
npm install
# Create .env file with: VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
```

## 📋 Features

- ✅ User Authentication (Register, Login, Logout, Password Reset)
- ✅ User Profiles with Image Upload
- ✅ Posts System (Create, Read, Update, Delete)
- ✅ Comments & Nested Replies
- ✅ Likes & Reactions System
- ✅ Friends System (Search, Request, Accept/Reject)
- ✅ Feed with Pagination
- ✅ Privacy Settings (Public/Private Posts)
- ✅ Security Features (Account Lockout, Rate Limiting)

## 🏗️ Technology Stack

**Backend:**
- Laravel 10.10
- Laravel Sanctum (Authentication)
- MySQL/PostgreSQL

**Frontend:**
- React 19.2.0
- TypeScript 5.9.3
- Vite 7.2.4
- Axios 1.13.2

## 📚 Documentation

For detailed documentation about the project architecture, features, API endpoints, and design decisions, see [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md).

## 🔒 Security Features

- Token-based authentication with expiration
- Account lockout after failed login attempts
- Password strength requirements
- Rate limiting on API endpoints
- XSS prevention
- CORS configuration
- Input validation

## 🚀 Deployment

Use the included `deploy.sh` script for automated deployment:

```bash
chmod +x deploy.sh
./deploy.sh
```

## 📁 Project Structure

```
Appifylab-Task/
├── Backend/          # Laravel API
├── frontend/         # React SPA
└── deploy.sh         # Deployment script
```

## 📝 API Endpoints

- Authentication: `/api/register`, `/api/login`, `/api/logout`
- Posts: `/api/posts` (CRUD operations)
- Comments: `/api/comments` (CRUD operations)
- Likes: `/api/likes/toggle`
- Friends: `/api/friends/*`
- Profile: `/api/profile`

See [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for complete API documentation.

## 🛠️ Development

### Backend Development
```bash
cd Backend
php artisan serve
```

### Frontend Development
```bash
cd frontend
npm run dev
```

## 📄 License

This project is open-sourced software.
