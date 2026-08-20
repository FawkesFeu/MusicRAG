#!/bin/bash
set -e

echo "===================================================="
echo "🚀 Music Industry - RAG Vector Search Platform"
echo "===================================================="
echo ""

# 1. Check for .env file
if [ ! -f .env ]; then
    echo "[1/4] 📄 .env file not found, copying from .env.example..."
    cp .env.example .env
    echo "✅ .env created."
else
    echo "[1/4] ✅ .env file exists."
fi

# 2. Install dependencies
echo ""
echo "[2/4] 📦 Installing dependencies..."
pnpm install

# 3. Migrate and seed
echo ""
echo "[3/4] 🌱 Preparing and seeding vector store..."
pnpm db:migrate
pnpm db:seed

# 4. Start all services
echo ""
echo "[4/4] 🌟 Starting all services (Frontend + API)..."
echo ""
echo "===================================================="
echo "🌐 Web UI:     http://localhost:3000"
echo "📡 API Server: http://localhost:3001"
echo ""
echo "👤 Demo Admin: admin@example.com / admin123Password!"
echo "👤 Demo User:  user@example.com  / user123Password!"
echo "===================================================="
echo ""

pnpm dev:all
