# CLS Backend Setup

## Prerequisites
1. Node.js (v14 or higher)
2. PostgreSQL (v12 or higher)
3. npm or yarn

## Setup Instructions

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
- Copy `.env.example` to `.env`
- Update database credentials in `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bank_admin_db
DB_USER=postgres
DB_PASSWORD=your_password
```

3. Setup database and run migrations:
```bash
node src/db/setup-db.js
```

This will:
- Create database if it doesn't exist
- Create all required tables
- Set up indexes and triggers
- Create default admin user

## Verification
To verify the setup, run:
```bash
node src/analyze-db.js
```

This will show all tables, indexes, and triggers to ensure everything is set up correctly.
