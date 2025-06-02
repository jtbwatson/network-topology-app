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
PROJECT_ROOT = Path(__file__).parent.parent
app.mount("/src", StaticFiles(directory=PROJECT_ROOT / "src"), name="src")
app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "assets"), name="assets")
app.mount("/sites", StaticFiles(directory=PROJECT_ROOT / "sites"), name="sites")

SITES_DIR = PROJECT_ROOT / "sites"

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
    
    # Extract info from comments (but don't override filename-based name)
    for line in lines:
        line = line.strip()
        if line.startswith('#'):
            if 'Site:' in line:
                metadata["name"] = line.split('Site:')[1].split('-')[0].strip()
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

async def combine_multi_file_site(site_dir: Path, main_d2_content: str) -> str:
    """Combine main.d2 with individual device files for multi-file sites"""
    try:
        combined_content = []
        device_files_found = []
        
        # Add main.d2 content (but skip the devices: {} block since we'll replace it with full definitions)
        main_lines = main_d2_content.split('\n')
        in_devices_block = False
        brace_count = 0
        
        for line in main_lines:
            stripped_line = line.strip()
            
            # Skip the devices: {} block entirely
            if stripped_line.startswith('devices:'):
                in_devices_block = True
                brace_count = 0
                continue
            
            if in_devices_block:
                # Count braces to know when block ends
                brace_count += line.count('{') - line.count('}')
                if brace_count <= 0 and '}' in line:
                    in_devices_block = False
                continue
            
            combined_content.append(line)
        
        # Find and read all individual device files
        for device_file in site_dir.glob("*.d2"):
            if device_file.name == "main.d2":
                continue
                
            try:
                async with aiofiles.open(device_file, mode='r') as f:
                    device_content = await f.read()
                
                device_files_found.append(device_file.name)
                combined_content.append(f"\n# === {device_file.name} ===")
                combined_content.append(device_content)
                
            except Exception as e:
                print(f"Warning: Could not read device file {device_file}: {e}")
        
        result = '\n'.join(combined_content)
        print(f"✅ Combined main.d2 with {len(device_files_found)} device files: {device_files_found}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error combining multi-file site {site_dir}: {e}")
        return main_d2_content  # Fallback to main.d2 only

@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    """Serve the frontend application"""
    try:
        async with aiofiles.open(PROJECT_ROOT / "index.html", mode='r') as f:
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

async def scan_sites_recursive(base_path: Path, current_path: Path = None) -> Dict:
    """Recursively scan for sites with hierarchical structure"""
    if current_path is None:
        current_path = base_path
    
    sites = {}
    
    # Scan for .d2 files in current directory
    for d2_file in current_path.glob("*.d2"):
        try:
            async with aiofiles.open(d2_file, mode='r') as f:
                content = await f.read()
            
            # Create site key with hierarchy (e.g., "amer.big_branch" or just "big_branch")
            relative_path = d2_file.relative_to(base_path)
            path_parts = [part.replace(' ', '_').replace('-', '_').lower() for part in relative_path.parts]
            site_key = '.'.join(path_parts[:-1] + [Path(path_parts[-1]).stem])
            
            # Extract metadata
            metadata = extract_site_metadata(content, d2_file.name)
            # Use filename (without extension) for single files
            metadata["name"] = d2_file.stem.replace('-', ' ').replace('_', ' ').title()
            metadata["last_modified"] = datetime.fromtimestamp(d2_file.stat().st_mtime).isoformat()
            metadata["hierarchy"] = list(relative_path.parts[:-1])  # Path without filename
            
            sites[site_key] = {
                "site_info": metadata,
                "d2": content,
                "file_path": str(relative_path)
            }
            
        except Exception as e:
            print(f"Error reading {d2_file}: {e}")
            continue
    
    # Scan subdirectories for main.d2 files (multi-file sites)
    for subdir in current_path.iterdir():
        if subdir.is_dir():
            main_d2 = subdir / "main.d2"
            if main_d2.exists():
                try:
                    async with aiofiles.open(main_d2, mode='r') as f:
                        content = await f.read()
                    
                    # Create hierarchical site key
                    relative_path = main_d2.relative_to(base_path)
                    path_parts = [part.replace(' ', '_').replace('-', '_').lower() for part in relative_path.parts[:-1]]
                    site_key = '.'.join(path_parts)
                    
                    metadata = extract_site_metadata(content, subdir.name)
                    # Use directory name for multi-file sites
                    metadata["name"] = subdir.name.replace('-', ' ').replace('_', ' ').title()
                    metadata["last_modified"] = datetime.fromtimestamp(main_d2.stat().st_mtime).isoformat()
                    metadata["type"] = "multi_file"
                    metadata["hierarchy"] = list(relative_path.parts[:-2])  # Path without site name and main.d2
                    
                    # For multi-file sites, combine main.d2 with individual device files
                    combined_d2 = await combine_multi_file_site(subdir, content)
                    
                    sites[site_key] = {
                        "site_info": metadata,
                        "d2": combined_d2,
                        "file_path": str(relative_path)
                    }
                    
                except Exception as e:
                    print(f"Error reading {main_d2}: {e}")
                    continue
            else:
                # Recursively scan subdirectories that don't have main.d2 (region folders)
                recursive_sites = await scan_sites_recursive(base_path, subdir)
                sites.update(recursive_sites)
    
    return sites

@app.get("/api/sites")
async def list_sites() -> JSONResponse:
    """List all available sites with hierarchical metadata"""
    if not SITES_DIR.exists():
        raise HTTPException(status_code=404, detail="Sites directory not found")
    
    sites = await scan_sites_recursive(SITES_DIR)
    
    # Build hierarchical structure for frontend
    hierarchy = {}
    for site_key, site_data in sites.items():
        path_parts = site_key.split('.')
        current_level = hierarchy
        
        # Build nested structure
        for i, part in enumerate(path_parts):
            if i == len(path_parts) - 1:
                # Last part is the site itself
                current_level[part] = {
                    "type": "site",
                    "data": site_data
                }
            else:
                # Intermediate parts are regions/folders
                if part not in current_level:
                    current_level[part] = {
                        "type": "region",
                        "children": {}
                    }
                current_level = current_level[part]["children"]
    
    return JSONResponse(content={
        "sites": sites,
        "hierarchy": hierarchy
    })

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