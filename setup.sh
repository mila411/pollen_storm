#!/bin/bash
set -euo pipefail

BACK_PID=""
FRONT_PID=""

cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    if [[ -n "${FRONT_PID}" ]]; then
        kill "${FRONT_PID}" 2>/dev/null || true
        wait "${FRONT_PID}" 2>/dev/null || true
        FRONT_PID=""
    fi
    if [[ -n "${BACK_PID}" ]]; then
        kill "${BACK_PID}" 2>/dev/null || true
        wait "${BACK_PID}" 2>/dev/null || true
        BACK_PID=""
    fi
    echo "✔ Services stopped"
}

trap 'echo "\n👋 CTRL+C detected"; cleanup; exit 0' INT TERM

echo "🌸 PollenStorm AI - Yarn 4 PnP Setup"
echo ""

project_root="$(cd "$(dirname "$0")" && pwd)"
cd "$project_root"

if ! command -v corepack >/dev/null 2>&1; then
    echo "❌ corepack が見つかりません。Node.js 16.10+ で corepack を有効化してください。"
    exit 1
fi

echo "📦 Installing frontend dependencies with Yarn 4 (PnP)..."
corepack enable >/dev/null 2>&1 || true

if [ -f "yarn.lock" ]; then
    corepack yarn install --immutable --inline-builds
else
    corepack yarn install --inline-builds
fi

echo "✓ Frontend dependencies installed (PnP mode, no node_modules)"
echo ""

echo "🐍 Setting up Python environment..."
cd "$project_root/ml-model"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

echo "Installing Python packages (this may take a few minutes)..."
pip install --quiet -r requirements.txt

echo "🚀 Starting FastAPI backend on http://127.0.0.1:8001 ..."
uvicorn main:app --host 127.0.0.1 --port 8001 --reload &
BACK_PID=$!

deactivate
cd "$project_root"

echo "🚀 Starting Next.js frontend on http://127.0.0.1:3000 ..."
corepack yarn dev --hostname 127.0.0.1 --port 3000 &
FRONT_PID=$!

echo ""
echo "✅ Setup complete!"
echo "Frontend: http://127.0.0.1:3000"
echo "Backend:  http://127.0.0.1:8001"
echo "Press CTRL+C to stop both services."

if [[ -n "${FRONT_PID}" ]]; then
    wait "${FRONT_PID}" 2>/dev/null || true
fi
if [[ -n "${BACK_PID}" ]]; then
    wait "${BACK_PID}" 2>/dev/null || true
fi
cleanup
