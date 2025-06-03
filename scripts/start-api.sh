#!/bin/bash

# Network Topology API Startup Script

echo "🚀 Starting Network Topology API..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Running setup..."
    npm run setup
fi

# Activate virtual environment and start API
source .venv/bin/activate
cd api
python start.py