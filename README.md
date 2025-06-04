# Network Topology Visualization App

This is a Network Topology Visualization application that dynamically renders network diagrams from D2 (declarative diagram) files. The application consists of a React frontend (via CDN) and a FastAPI backend.

## Architecture

**Frontend Framework**: React 18 (loaded via CDN)
- **vis.js Network**: For stable, grid-based network topology visualization  
- **Tailwind CSS**: For styling (loaded via CDN)
- **Babel Standalone**: For JSX transformation in browser
- **Global Functions Pattern**: Pseudo-modular architecture using `window.ComponentName` exports

**Backend**: FastAPI Python server
- Serves static frontend files (HTML, CSS, JS)
- Provides REST API for D2 topology data discovery and serving
- Automatic site discovery by scanning `sites/` directory recursively
- Supports both single `.d2` files and multi-file sites with `main.d2`

**Data Sources**: D2 files in the `sites/` directory
- Automatically discovers all `.d2` files and `main.d2` + device combinations
- Supports hierarchical organization and multi-file site structures
- Extracts metadata from D2 file comments and filenames
- Example: `sites/gns3-lab/main.d2` + `sites/gns3-lab/devices/*.d2`

**Additional Assets**:
- `assets/icons/` - Professional SVG icons for device types (router, switch, firewall, wifi, cloud)

**Application Structure**:
- `index.html` - Main entry point with modular architecture using global functions
- `src/components/` - Reusable UI components (exported as global functions)
- `src/hooks/` - Custom React hooks for data and state management
- `src/utils/` - Utility functions and parsers
- `api/` - FastAPI backend for serving D2 files and static assets
- `sites/` - D2 topology files (automatically discovered)

## Development Commands

**First-time setup:**
```bash
npm run setup    # Installs Python dependencies in virtual environment
```

**Start the application:**
```bash
npm run start    # Starts FastAPI backend + serves frontend on port 8000
npm run api      # Same as npm run start
```

**Config parser (Cisco to D2):**
```bash
npm run config-parser    # Parse GNS3 lab configs (uses default paths)
# Or with custom paths:
./scripts/config-parser.sh "path/to/configs" "output/dir" "Site Name" "Location"
```

**Access the application:**
- Frontend: http://localhost:8000
- API docs: http://localhost:8000/docs

**Architecture Note**: The application uses a pseudo-modular approach where components are loaded as global functions via Babel script tags. This allows separation of concerns without requiring a build system, but **dependency order matters** - utilities must load before hooks, hooks before components.

## Key Components

### Utilities (`src/utils/`)
- **`d2Parser.js`** - Parses D2 syntax into devices, interfaces, and connections
- **`deviceUtils.js`** - Device type detection, icons, colors, and interface utilities
- **`layoutUtils.js`** - Layout controls for vis.js Network (reset, arrange, grid snap)

### Custom Hooks (`src/hooks/`)
- **`useNetworkData.js`** - Fetches and processes D2 topology data from FastAPI backend
- **`useVisNetworkVisualization.js`** - vis.js Network setup with stable positioning and layout controls

### Components (`src/components/`)
- **`SiteTreeNavigation.js`** - Site selection with hierarchical organization
- **`NodeListPanel.js`** - Device overview list when no device is selected
- **`DeviceDetailsPanel.js`** - Layer 2 device information and interfaces
- **`Layer3Panel.js`** - Routing protocols, SVIs, Layer 3 configuration
- **`ConnectionDetailsPanel.js`** - Link details between devices
- **`Modals.js`** - Access points modal and routing table modal

### Core Features
- **vis.js Network Visualization**: Stable network topology with controlled physics and auto-stabilization
- **Multiple Connection Handling**: Smart edge processing with minimal curves for clarity and clickability
- **Grid-Based Layout**: Professional diagram positioning with snap-to-grid functionality
- **Layout Controls**: Reset, hierarchical arrangement, and grid snap features
- **Device Type Support**: Routers, switches, firewalls, wireless controllers, WAN providers
- **Interface Management**: Physical ports, SVIs, and LAG interfaces with detailed configuration
- **Routing Information**: OSPF, BGP, static routes, and VRRP/HSRP status
- **External Connection Support**: WAN/ISP provider integration with circuit details
- **Professional SVG Icons**: Custom icon set for consistent device representation
- **LAG Support**: Link Aggregation Groups with visual indicators and LACP configuration
- **FastAPI Backend**: Automatic site discovery and REST API for topology data
- **Config Parser**: Cisco configuration to D2 conversion for GNS3 lab integration

## Working with D2 Files

D2 files use a hierarchical syntax:
```d2
device_name: {
  label: "Display Name"
  type: "router|switch|firewall|wireless_controller|wan_provider"
  mgmt_ip: "192.168.1.1"
  
  interface_name: {
    description: "Link description"
    ip_address: "10.1.1.1/24"
    status: "up|down"
    vlan: "100"
  }
  
  # LAG interfaces supported
  lag_1: {
    description: "Link Aggregation Group"
    ip_address: "192.168.100.0/31"
    protocol: "LACP"
    status: "up"
  }
}

# Connections
device1.interface1 -> device2.interface2
```

**Device Types Supported**:
- `router` - Layer 3 routing devices
- `switch` - Layer 2/3 switching devices  
- `firewall` - Security appliances
- `wireless_controller` - Wireless LAN controllers
- `access_point` - Wireless access points
- `wan_provider` - External/WAN connection providers (ISP, MPLS, etc.)

**Interface Properties**:
- Physical interfaces (ethernet, gigabit, port patterns)
- Channel groups and port channels
- LAG (Link Aggregation) interfaces - Added support for "lag" keyword detection
- SVI interfaces (vlan10, vlan20, etc.)
- WAN interfaces (WAN1, WAN2, etc.) for external connections
- Configuration includes VLANs, IP addressing, routing protocol settings
- Provider circuit information (bandwidth, circuit ID, SLA class)
- BGP session configuration (eBGP/iBGP, ASN, neighbor details)
- LACP configuration for port channels and LAG groups

## File Organization

### Frontend Architecture
- **No build system** - Uses `<script type="text/babel">` tags for JSX transformation
- **Global function pattern** - Components exported as `window.ComponentName = ...`
- **Dependency order matters** - Utilities → Hooks → Components → Main App
- **Module loading via index.html** - All script tags must be added to index.html

### Backend Architecture
- **FastAPI** serves static files and provides REST API for D2 topology data
- **Automatic site discovery** - Scans `sites/` directory for `.d2` files recursively
- **Multi-file site support** - Sites can use `main.d2` + individual device files in `devices/` subdirectory

### Site Organization
- **Single files**: `sites/branch.d2`, `sites/big branch.d2`
- **Multi-file sites**: `sites/gns3-lab/main.d2` + `sites/gns3-lab/devices/*.d2`
- **Hierarchical**: `sites/region/country/city.d2` (automatic discovery)
- **Metadata extraction**: From D2 comments and file structure

## Adding New Features

### Device Types
1. Add device type to `deviceUtils.js` in `getDeviceIcon()` and `getDeviceColor()`
2. Update D2 parser type detection in `d2Parser.js`
3. Add device-specific UI sections in relevant component files

### Interface Properties
1. Extend D2 parser's property extraction in `parseD2ToGraph()`
2. Update interface utility functions in `deviceUtils.js`
3. Add UI rendering in `DeviceDetailsPanel.js` or `ConnectionDetailsPanel.js`

### New Components
1. Create in `src/components/` with `window.ComponentName = ...` export
2. Add `<script>` tag to `index.html` (order matters)
3. Reference as `<window.ComponentName>` in JSX

## Common Tasks

**Adding new D2 files**: 
- Place in `sites/` directory (or subdirectories for organization)
- Files are automatically discovered and loaded
- Add metadata in D2 file comments for better organization

**Modifying visualization**: 
- Update vis.js Network configuration in `useVisNetworkVisualization.js`
- Modify network options, physics settings, or layout algorithms
- Add new layout control functions (reset, hierarchical, grid snap)

**Extending UI panels**: 
- Edit component files in `src/components/`
- Add new sections to existing panels or create new components

**Adding utility functions**:
- Create or extend files in `src/utils/` with global exports (`window.functionName = ...`)
- Add script tag to `index.html` to load utilities before components
- Reference functions as `window.functionName()` in components

## Important Notes

- **Module loading order:** Utilities must load before hooks, hooks before components
- **Global exports:** All modules use `window.functionName = ...` pattern for cross-file access
- **No TypeScript/build system:** Pure JavaScript with Babel transformation in browser
- **vis.js Network:** Provides stable, professional network visualization (not D3 force simulation)
- **FastAPI backend required:** Frontend depends on `/api/sites` endpoint for topology data

## Visualization Technology

The application uses **vis.js Network** for professional, stable network topology visualization. This provides:

### Key Features
- **Stable Positioning**: Nodes don't bounce around like D3 force simulations
- **Professional Layout**: Grid-based positioning suitable for network documentation
- **Multiple Connection Support**: Handles multiple links between same devices with minimal curves
- **Interactive Controls**: Reset layout, hierarchical arrangement, and grid snap functionality

### User Interface
- **Click & Drag**: Move devices around the canvas
- **Zoom**: Scroll to zoom in/out
- **Device Selection**: Click devices or connections for detailed information
- **Layout Controls**: Use buttons to reset, arrange hierarchically, or enable grid snap

### Edge Processing
Multiple connections between the same devices are automatically processed to:
- Keep the first connection perfectly straight
- Add minimal curves (0.08-0.2 roundness) to subsequent connections
- Ensure all connections remain individually clickable
- Maintain visual clarity and professional appearance