"""
FastAPI backend for Network Topology Visualization
Serves D2 files and provides network topology data
"""

import os
import aiofiles
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from pathlib import Path
from typing import Dict, List, Optional
import re
from datetime import datetime

app = FastAPI(
    title="Network Topology API",
    description="API for serving network topology data from D2 files",
    version="1.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files (serve the frontend)
# Mount the entire parent directory to serve frontend files
app.mount("/src", StaticFiles(directory="../src"), name="src")
app.mount("/assets", StaticFiles(directory="../assets"), name="assets")
app.mount("/sites", StaticFiles(directory="../sites"), name="sites")

SITES_DIR = Path("../sites")

def extract_site_metadata(d2_content: str, filename: str) -> Dict:
    """Extract metadata from D2 file content and filename"""
    lines = d2_content.split('\n')
    metadata = {
        "name": filename.replace('.d2', '').replace('_', ' ').title(),
        "filename": filename,
        "description": None,
        "location": "Unknown",
        "devices_count": 0,
        "device_types": [],
        "last_modified": None
    }
    
    # Extract info from comments
    for line in lines:
        line = line.strip()
        if line.startswith('#'):
            if 'Site' in line or 'Network' in line:
                # Extract site name from comment
                comment_text = line.replace('#', '').strip()
                if 'Site:' in comment_text:
                    metadata["name"] = comment_text.split('Site:')[1].split('-')[0].strip()
                elif 'Network Topology' in comment_text:
                    metadata["name"] = comment_text.replace('Network Topology', '').replace('-', '').strip()
            elif 'Location:' in line:
                metadata["location"] = line.split('Location:')[1].strip()
            elif 'Description:' in line:
                metadata["description"] = line.split('Description:')[1].strip()
    
    # Count devices and extract types
    device_types = set()
    device_count = 0
    
    for line in lines:
        line = line.strip()
        # Device definition (top-level object with label/type)
        if ': {' in line and not '->' in line and not '/' in line:
            device_count += 1
        # Extract device types
        if line.startswith('type:'):
            type_match = re.search(r'type:\s*["\']?([^"\']+)["\']?', line)
            if type_match:
                device_types.add(type_match.group(1))
    
    metadata["devices_count"] = device_count
    metadata["device_types"] = list(device_types)
    
    # Estimate AP count based on wireless controllers
    wlc_count = sum(1 for dt in device_types if 'wireless' in dt.lower())
    metadata["aps_count"] = wlc_count * 12  # Typical WLC handles 12-50 APs
    
    return metadata

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the frontend application"""
    try:
        async with aiofiles.open("../index.html", mode='r') as f:
            content = await f.read()
        return HTMLResponse(content=content)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Frontend not found</h1><p>Run from the project root directory</p>")

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "sites_directory": str(SITES_DIR.absolute()),
        "sites_exists": SITES_DIR.exists()
    }

@app.get("/api/sites")
async def list_sites() -> JSONResponse:
    """List all available sites with metadata"""
    if not SITES_DIR.exists():
        raise HTTPException(status_code=404, detail="Sites directory not found")
    
    sites = {}
    
    # Scan for .d2 files in sites directory
    for d2_file in SITES_DIR.glob("*.d2"):
        try:
            async with aiofiles.open(d2_file, mode='r') as f:
                content = await f.read()
            
            # Create site key (filename without extension, spaces replaced with underscores)
            site_key = d2_file.stem.replace(' ', '_').lower()
            
            # Extract metadata
            metadata = extract_site_metadata(content, d2_file.name)
            metadata["last_modified"] = datetime.fromtimestamp(d2_file.stat().st_mtime).isoformat()
            
            sites[site_key] = {
                "site_info": metadata,
                "d2": content,
                "file_path": str(d2_file.relative_to(SITES_DIR))
            }
            
        except Exception as e:
            print(f"Error reading {d2_file}: {e}")
            continue
    
    # Also scan subdirectories for main.d2 files (future multi-file support)
    for subdir in SITES_DIR.iterdir():
        if subdir.is_dir():
            main_d2 = subdir / "main.d2"
            if main_d2.exists():
                try:
                    async with aiofiles.open(main_d2, mode='r') as f:
                        content = await f.read()
                    
                    site_key = subdir.name.replace(' ', '_').replace('-', '_').lower()
                    
                    metadata = extract_site_metadata(content, subdir.name)
                    metadata["last_modified"] = datetime.fromtimestamp(main_d2.stat().st_mtime).isoformat()
                    metadata["type"] = "multi_file"  # Flag for future handling
                    
                    sites[site_key] = {
                        "site_info": metadata,
                        "d2": content,
                        "file_path": str(main_d2.relative_to(SITES_DIR))
                    }
                    
                except Exception as e:
                    print(f"Error reading {main_d2}: {e}")
                    continue
    
    return JSONResponse(content={"sites": sites})

@app.get("/api/sites/{site_name}")
async def get_site(site_name: str) -> JSONResponse:
    """Get specific site data"""
    # Try direct .d2 file first
    d2_file = SITES_DIR / f"{site_name.replace('_', ' ')}.d2"
    
    if not d2_file.exists():
        # Try with underscores
        d2_file = SITES_DIR / f"{site_name}.d2"
    
    if not d2_file.exists():
        # Try as subdirectory with main.d2
        subdir = SITES_DIR / site_name.replace('_', '-')
        main_d2 = subdir / "main.d2"
        if main_d2.exists():
            d2_file = main_d2
    
    if not d2_file.exists():
        raise HTTPException(status_code=404, detail=f"Site '{site_name}' not found")
    
    try:
        async with aiofiles.open(d2_file, mode='r') as f:
            content = await f.read()
        
        metadata = extract_site_metadata(content, d2_file.name)
        metadata["last_modified"] = datetime.fromtimestamp(d2_file.stat().st_mtime).isoformat()
        
        return JSONResponse(content={
            "site_info": metadata,
            "d2": content,
            "file_path": str(d2_file.relative_to(SITES_DIR))
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading site file: {str(e)}")

@app.get("/api/sites/{site_name}/devices/{device_name}")
async def get_device(site_name: str, device_name: str) -> JSONResponse:
    """Get specific device data (for future multi-file support)"""
    # Check if site uses multi-file structure
    site_dir = SITES_DIR / site_name.replace('_', '-')
    device_file = site_dir / f"{device_name}.d2"
    
    if not device_file.exists():
        raise HTTPException(status_code=404, detail=f"Device '{device_name}' not found in site '{site_name}'")
    
    try:
        async with aiofiles.open(device_file, mode='r') as f:
            content = await f.read()
        
        return JSONResponse(content={
            "device_name": device_name,
            "d2": content,
            "last_modified": datetime.fromtimestamp(device_file.stat().st_mtime).isoformat()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading device file: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)