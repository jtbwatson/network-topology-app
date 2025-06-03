# Network Topology Visualization App

This is a Network Topology Visualization application that dynamically renders network diagrams from D2 (declarative diagram) files. The application is built as a single-page React application using vanilla HTML/JavaScript with CDN dependencies.

## Architecture

**Frontend Framework**: React 18 (loaded via CDN)
- **vis.js Network**: For stable, grid-based network topology visualization
- **Tailwind CSS**: For styling (loaded via CDN)
- **Babel Standalone**: For JSX transformation in browser
- **ES6 Modules**: Modular architecture with separated concerns

**Data Sources**: D2 files in the `sites/` directory containing network topology definitions
- Automatically discovers all `.d2` files in sites/ directory
- Supports hierarchical organization (e.g., `north-america/usa/california/san-francisco.d2`)
- Extracts metadata from D2 file comments and filenames
- Examples: `branch.d2`, `campus.d2`, `datacenter.d2`, `big branch.d2`

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

**Local Development**:
```bash
# Setup and start (first time)
npm run setup    # Install Python dependencies
npm run start    # Start FastAPI server + frontend on port 8000

# Alternative
npm run api      # Same as npm run start
```

**Accessing the application**: 
- Open `http://localhost:8000` in a browser
- API documentation available at `http://localhost:8000/docs`

**Architecture Note**: The application uses a pseudo-modular approach where components are loaded as global functions via Babel script tags, allowing for separation of concerns without requiring a build system.

**FastAPI Backend**: The application includes a FastAPI backend that serves D2 files via REST API, enabling automatic file discovery and future integration with GNS3, SNMP, and other network data sources. API documentation is available at `/docs` when running the server.

## Key Components

### Utilities (`src/utils/`)
- **`d2Parser.js`** - D2 syntax parser extracting devices, interfaces, and connections
- **`deviceUtils.js`** - Device type detection, icons, colors, and interface management
- **`layoutUtils.js`** - Layout utility functions (legacy D3 utilities)

### Custom Hooks (`src/hooks/`)
- **`useNetworkData.js`** - Manages D2 file loading, parsing, and error handling
- **`useVisNetworkVisualization.js`** - vis.js Network visualization with stable positioning and grid controls

### Components (`src/components/`)
- **`SiteTreeNavigation.js`** - Hierarchical site selection and navigation
- **`NodeListPanel.js`** - Device overview list when no device is selected
- **`DeviceDetailsPanel.js`** - Layer 2 device information and interface details
- **`Layer3Panel.js`** - Routing protocols, SVIs, and Layer 3 configuration
- **`ConnectionDetailsPanel.js`** - Link details and interface configuration comparison
- **`Modals.js`** - Access points modal and routing table modal

### Core Features
- **vis.js Network Visualization**: Stable network topology with controlled physics and auto-stabilization
- **Multiple Connection Handling**: Smart edge processing with minimal curves for clarity and clickability
- **Grid-Based Layout**: Professional diagram positioning with snap-to-grid functionality
- **Layout Controls**: Reset, hierarchical arrangement, and grid snap features
- **Device Type Support**: Routers, switches, firewalls, wireless controllers, WAN providers
- **Interface Management**: Physical ports and SVIs with detailed configuration
- **Routing Information**: OSPF, BGP, static routes, and VRRP/HSRP status
- **External Connection Support**: WAN/ISP provider integration with circuit details
- **Professional SVG Icons**: Custom icon set for consistent device representation
- **Port Channel Support**: LACP port channels with visual ellipse indicators
- **Dynamic Site Loading**: Programmatic generation without hardcoded manifests

## Working with D2 Files

D2 files use a hierarchical syntax:
```d2
device_name: {
  label: "Display Name"
  type: "router|switch|firewall|wireless_controller"
  mgmt_ip: "192.168.1.1"
  
  interface_name: {
    description: "Link description"
    ip_address: "10.1.1.1"
    subnet_mask: "255.255.255.0"
    status: "up|down"
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
- Physical interfaces (GigabitEthernet0/0/1, 1/0/24, etc.)
- SVI interfaces (vlan10, vlan20, etc.)
- WAN interfaces (WAN1, WAN2, etc.) for external connections
- LAG interfaces (lag 1, lag 2, etc.) for link aggregation
- Configuration includes VLANs, IP addressing, routing protocol settings
- Provider circuit information (bandwidth, circuit ID, SLA class)
- BGP session configuration (eBGP/iBGP, ASN, neighbor details)
- LACP configuration for port channels and LAG groups

## File Organization

### Current Modular Structure
- **Components**: Separated into individual files in `src/components/` (exported as `window.ComponentName`)
- **Hooks**: Custom React hooks in `src/hooks/` (exported as `window.hookName`)
- **Utilities**: Pure functions and parsers in `src/utils/` (exported as `window.functionName`)
- **Entry Point**: `index.html` loads modules as global functions via Babel
- **No build process**: All files are loaded with `<script type="text/babel">` tags
- **App Logic**: Main React component is embedded in `index.html`
- **FastAPI Backend**: Python backend (`api/main.py`) handles D2 file discovery and serving

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
1. Create component file in `src/components/` with global function export (`window.ComponentName = ...`)
2. Add script tag to `index.html` to load the component
3. Reference component as `<window.ComponentName>` in JSX or add to appropriate UI panel

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

**Module Loading**: The application uses a pseudo-modular approach where components are loaded as global functions via Babel script tags. This allows for separation of concerns without requiring a build system.

**Development Workflow**: When adding new files, always update `index.html` to include the script tag, and ensure dependencies are loaded in the correct order (utils → hooks → components → main app).

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