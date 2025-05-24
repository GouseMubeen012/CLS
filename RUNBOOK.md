# CLS (Cash-Less System) Runbook

This runbook provides detailed instructions for setting up and running the CLS project.

## Prerequisites

1. Install Docker
   ```bash
   # For macOS using Homebrew
   brew install docker
   brew install docker-compose

   # For Ubuntu/Debian Linux
   sudo apt-get update
   sudo apt-get install docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   sudo usermod -aG docker $USER  # Add user to docker group (requires logout/login)
   ```

2. Install PostgreSQL
   ```bash
   # For macOS using Homebrew
   brew install postgresql@14

   # For Ubuntu/Debian Linux
   sudo apt-get update
   sudo apt-get install postgresql-14
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. Install Node.js (v16 or later)
   ```bash
   # For macOS using Homebrew
   brew install node

   # For Ubuntu/Debian Linux using nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   source ~/.bashrc
   nvm install 16
   nvm use 16
   ```

4. Install pgAdmin4 (Optional - for GUI database management)
  

## Database Setup

### Option 1: Using Command Line (use pg admin)

1. Start PostgreSQL service
   ```bash
   # For macOS
   brew services start postgresql

   # For Linux
   sudo systemctl start postgresql
   ```

2. Create database
   ```bash
   # For macOS
   psql postgres

   # For Linux
   sudo -u postgres psql

   # Create database
   CREATE DATABASE cls_db;

   # Create user (if not exists)
   CREATE USER cls_user WITH PASSWORD 'your_password';

   # Grant privileges
   GRANT ALL PRIVILEGES ON DATABASE cls_db TO cls_user;

   # Exit psql
   \q
   ```

### Option 2: Using pgAdmin4

1. Launch pgAdmin4

2. Add New Server
   - Right-click on 'Servers' → 'Register' → 'Server...'
   - General tab:
     - Name: CLS Local
   - Connection tab:
     - Host: localhost
     - Port: 5432
     - Maintenance database: postgres
     - Username: postgres 
     - Password: your_postgres_password => craete a passowrd in pg admin

3. Create Database
   - Right-click on 'Databases' → 'Create' → 'Database...'
   - Database: cls_db => create database 
   - Owner: postgres

- after creating data base update the .env file in backend folder

3. Update the .env file in backend folder

   DB_NAME=cls_db => update the db name that created
   DB_PASSWORD=your_password => update the password that created


3. Run migrations (setup the tables)
   ```bash
   # Navigate to backend directory
   cd backend

   # Run migrations
   node src/db/migrations.js (this will create the tables in the data base)

   ```

4. Build and Start Services (using docker-compose.yml)

   inside cls directory run the following commands
   ```bash
   # Build all services
   docker-compose build

   # Start all services
   docker-compose up -d

Access applications
   - Bank Frontend: http://localhost:3000
   - Store Frontend: http://localhost:4000
   - Backend API: http://localhost:5000

at Bank frontend login with the following credentials
   - username: admin@gmail.com
   - password: admin123