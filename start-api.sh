#!/bin/bash

# Network Topology API Startup Script

echo "🚀 Starting Network Topology API..."

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found. Running setup..."
    npm run setup
fi

# Activate virtual environment and start API
source .venv/bin/activate
cd api
python start.py