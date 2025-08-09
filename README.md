# Social Development Website - Backend

This repository contains the backend API for the Social Development Website — a platform aimed at inspiring and connecting communities through shared posts, comments, and social interaction features.

> ⚠️ **Work In Progress:** This backend is actively under development. Features and APIs may change as development continues.

---

## Features (In Progress)

- User authentication and role management (user/admin)
- CRUD operations for posts, comments, users, and tags
- Voting system on posts (upvotes/downvotes)
- Admin announcements and user management
- Comment reporting and moderation features
- Payment integration (Stripe) for future enhancements

---

## Technologies Used

- Node.js & Express.js
- MongoDB (native driver)
- Firebase Admin SDK for authentication & token verification
- Stripe API for payment processing
- Nodemailer for email notifications
- dotenv for environment variable management

---

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- MongoDB (Atlas or local)
- Firebase Project & Service Account credentials
- Stripe account credentials (for payment features)

### Setup

1. Clone the repository

```
git clone https://github.com/alzamo12/social-development-backend.git
cd social-development-backend
```

2. Install dependencies
  ```
npm i
```

3. Environment Variable
 ```
PORT=5000
DB_USER=your__mongo_project_username
DB_PASS=your_mongo_project_pass
FIREBASE_PROJECT_ID=your_firebase_project_id
STRIPE_SECRET_KEY=your_stripe_secret_key
NODEMAILER_AUTH_GMAIL_ID=your_gmail_email
NODEMAILER_AUTH_GMAIL_APP_PASS=your_gmail_app_password
ACCESS_TOKEN_SECRET=your_jwt_secret
```
4. Run locally
   ```
   npm run dev
   ```

