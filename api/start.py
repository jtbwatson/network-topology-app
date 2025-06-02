#!/usr/bin/env python3
"""
Startup script for the Network Topology API
"""

import uvicorn
import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Starting Network Topology API...")
    print("📁 Serving D2 files from: ../sites/")
    print("🌐 Frontend available at: http://localhost:8000/")
    print("📊 API docs available at: http://localhost:8000/docs")
    print("💡 Health check: http://localhost:8000/api/health")
    print()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=["../sites", "."],
        log_level="info"
    )