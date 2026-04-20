#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  TORII  —  Japan Market Research Hub
#  Launcher for macOS / Linux
# ─────────────────────────────────────────────────────────────
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

# Check Node is installed
if ! command -v node &> /dev/null; then
  echo "❌  Node.js not found. Please install from https://nodejs.org (v18 or newer)"
  exit 1
fi

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "📦  Installing dependencies (first run only)…"
  npm install
fi

# Optional: set API keys as env vars before starting
# export OPENAI_API_KEY="sk-..."
# export PERPLEXITY_API_KEY="pplx-..."

echo ""
echo "  ████████╗ ██████╗ ██████╗ ██╗ ██╗"
echo "     ██╔══╝██╔═══██╗██╔══██╗██║ ██║"
echo "     ██║   ██║   ██║██████╔╝██║ ██║"
echo "     ██║   ██║   ██║██╔══██╗██║ ██║"
echo "     ██║   ╚██████╔╝██║  ██║██║ ██║"
echo "     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═╝"
echo ""
echo "  Japan Market Research Hub"
echo "  ─────────────────────────────────"
echo "  Opening at: http://localhost:3000"
echo ""

# Open browser after short delay (macOS / Linux)
(sleep 3 && open "http://localhost:3000" 2>/dev/null || \
           xdg-open "http://localhost:3000" 2>/dev/null || \
           true) &

# Start the dev server
PORT=3000 npm run dev
