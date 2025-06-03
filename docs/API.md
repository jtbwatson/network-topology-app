# Network Topology API

FastAPI backend for serving network topology data from D2 files.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm run setup
```
or manually:
```bash
pip install -r requirements.txt
```

### 2. Start the API Server
```bash
npm run api
```
or manually:
```bash
cd api && python start.py
```

### 3. Access the Application
- **Frontend**: http://localhost:8000/
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## 📚 API Endpoints

### Core Endpoints
- `GET /api/sites` - List all available sites with metadata
- `GET /api/sites/{site_name}` - Get specific site data
- `GET /api/health` - Health check and system status

### Future Endpoints (Ready for Implementation)
- `GET /api/sites/{site_name}/devices/{device_name}` - Device-specific data (multi-file support)
- `POST /api/gns3/sync` - Sync from GNS3 project (planned)
- `GET /api/devices/{device}/config` - Live device configuration (planned)

## 🏗️ Architecture

### Current Features
- ✅ **File Discovery**: Automatically scans `sites/` directory for .d2 files
- ✅ **Metadata Extraction**: Parses D2 comments for site information
- ✅ **CORS Support**: Configured for frontend development
- ✅ **Static File Serving**: Serves the frontend application
- ✅ **Error Handling**: Graceful error responses and logging
- ✅ **Backward Compatibility**: Frontend falls back to direct file access if API unavailable

### Data Format
The API returns data in the same format the frontend expects:
```json
{
  "sites": {
    "big_branch": {
      "site_info": {
        "name": "Big Branch Office",
        "location": "Regional Office - East Coast",
        "devices_count": 9,
        "device_types": ["router", "switch", "wireless_controller", "wan"],
        "aps_count": 24,
        "last_modified": "2024-01-06T10:30:00"
      },
      "d2": "# D2 file content...",
      "file_path": "big branch.d2"
    }
  }
}
```

## 🔧 Development

### Project Structure
```
api/
├── main.py          # FastAPI application
├── start.py         # Development server startup
└── requirements.txt # Python dependencies
```

### Adding New Endpoints
```python
@app.get("/api/new-endpoint")
async def new_endpoint():
    return {"message": "Hello from new endpoint"}
```

### Environment Variables
- `API_PORT` - Server port (default: 8000)
- `SITES_DIR` - D2 files directory (default: ../sites)
- `DEBUG` - Enable debug logging (default: False)

## 🚀 Future Expansion Plans

### Phase 1: Multi-File Support ✨
- Support `sites/{site}/main.d2` + individual device files
- Lazy loading of device-specific configurations
- Enhanced metadata and device discovery

### Phase 2: GNS3 Integration 🧪
- Connect to GNS3 server API
- Real-time device status and configuration
- Automatic topology discovery from running labs

### Phase 3: Live Network Integration 📡
- SNMP device polling
- SSH configuration retrieval
- NetBox/IPAM synchronization
- Real-time interface status updates

### Phase 4: Advanced Features 🎯
- Authentication and authorization
- Change tracking and versioning
- WebSocket updates for real-time changes
- Multi-tenant support

## 🛠️ Troubleshooting

### Common Issues

**API won't start:**
```bash
# Check if port 8000 is in use
lsof -i :8000

# Install dependencies
pip install -r requirements.txt
```

**Frontend can't connect to API:**
- Ensure API is running on port 8000
- Check CORS configuration in `main.py`
- Verify sites directory exists and contains .d2 files

**No sites found:**
- Ensure .d2 files are in `sites/` directory
- Check file permissions and syntax
- Review API logs for specific errors

### Development Tips
- API auto-reloads when files change
- Check logs in terminal for detailed error information
- Use `/api/health` endpoint to verify API status
- Visit `/docs` for interactive API documentation

## 📝 Contributing

When adding new features:
1. Update API endpoints in `main.py`
2. Update frontend hooks if needed
3. Add tests for new functionality
4. Update this documentation