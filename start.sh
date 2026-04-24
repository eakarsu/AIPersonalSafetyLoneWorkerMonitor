#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_green()  { echo -e "${GREEN}✔ $1${NC}"; }
print_blue()   { echo -e "${BLUE}ℹ $1${NC}"; }
print_red()    { echo -e "${RED}✖ $1${NC}"; }
print_yellow() { echo -e "${YELLOW}⚠ $1${NC}"; }

# Trap CTRL+C to kill child processes
cleanup() {
    echo ""
    print_yellow "Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    wait 2>/dev/null
    print_green "All services stopped. Goodbye!"
    exit 0
}
trap cleanup SIGINT SIGTERM

# Banner
echo -e "${CYAN}${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║                                                      ║"
echo "║        SafeGuard AI - Lone Worker Monitor            ║"
echo "║                                                      ║"
echo "║   Real-time safety monitoring powered by AI          ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Step 1: Check PostgreSQL
print_blue "Checking PostgreSQL status..."
if brew services list | grep -q "postgresql.*started"; then
    print_green "PostgreSQL is already running"
else
    print_yellow "PostgreSQL is not running. Starting..."
    brew services start postgresql 2>/dev/null || brew services start postgresql@14 2>/dev/null || brew services start postgresql@15 2>/dev/null || brew services start postgresql@16 2>/dev/null
    if [ $? -eq 0 ]; then
        print_green "PostgreSQL started successfully"
        sleep 2
    else
        print_red "Failed to start PostgreSQL. Please start it manually."
        exit 1
    fi
fi

# Step 2: Clean ports 3000 and 3001
print_blue "Cleaning ports 3000 and 3001..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 1
print_green "Ports 3000 and 3001 are free"

# Step 3: Create database
print_blue "Ensuring database exists..."
createdb lone_worker_monitor 2>/dev/null || true
print_green "Database ready"

# Step 4: Install backend dependencies
print_blue "Installing backend dependencies..."
cd "$PROJECT_DIR/backend" && npm install
if [ $? -eq 0 ]; then
    print_green "Backend dependencies installed"
else
    print_red "Failed to install backend dependencies"
    exit 1
fi

# Step 5: Run seed script
print_blue "Seeding database..."
cd "$PROJECT_DIR/backend" && node src/seed.js
if [ $? -eq 0 ]; then
    print_green "Database seeded successfully"
else
    print_yellow "Seed script encountered issues (may be non-critical)"
fi

# Step 6: Install frontend dependencies
print_blue "Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend" && npm install
if [ $? -eq 0 ]; then
    print_green "Frontend dependencies installed"
else
    print_red "Failed to install frontend dependencies"
    exit 1
fi

# Step 7: Start backend with nodemon (hot reload)
print_blue "Starting backend server with hot reload (nodemon)..."
cd "$PROJECT_DIR/backend" && npx nodemon src/server.js &
BACKEND_PID=$!

# Step 8: Start frontend with vite dev server (HMR)
print_blue "Starting frontend dev server with HMR (vite)..."
cd "$PROJECT_DIR/frontend" && npx vite --port 3000 &
FRONTEND_PID=$!

# Step 9: Wait for servers to be ready
print_blue "Waiting for servers to start..."
RETRIES=0
MAX_RETRIES=30
while ! curl -s http://localhost:3001 >/dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
        print_yellow "Backend may still be starting up..."
        break
    fi
    sleep 1
done

RETRIES=0
while ! curl -s http://localhost:3000 >/dev/null 2>&1; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
        print_yellow "Frontend may still be starting up..."
        break
    fi
    sleep 1
done

# Step 10: Print status
echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  All services are running!${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${CYAN}Frontend:${NC}  ${BOLD}http://localhost:3000${NC}"
echo -e "  ${CYAN}Backend:${NC}   ${BOLD}http://localhost:3001${NC}"
echo ""
echo -e "  ${YELLOW}Login Credentials:${NC}"
echo -e "  ${BLUE}Email:${NC}     admin@safeguard.com"
echo -e "  ${BLUE}Password:${NC}  admin123"
echo ""
echo -e "  ${BLUE}Backend:${NC}   Hot reload via ${BOLD}nodemon${NC} (watches for file changes)"
echo -e "  ${BLUE}Frontend:${NC}  Hot reload via ${BOLD}Vite HMR${NC} (instant updates)"
echo ""
echo -e "  Press ${RED}CTRL+C${NC} to stop all services"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# Step 11: Wait for all background processes
wait
