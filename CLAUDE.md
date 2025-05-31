# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Network Topology Visualization application that dynamically renders network diagrams from D2 (declarative diagram) files. The application is built as a single-page React application using vanilla HTML/JavaScript with CDN dependencies.

## Architecture

**Frontend Framework**: React 18 (loaded via CDN)
- **D3.js**: For interactive network visualization and force-directed graphs
- **Tailwind CSS**: For styling (loaded via CDN)
- **Babel Standalone**: For JSX transformation in browser
- **ES6 Modules**: Modular architecture with separated concerns

**Data Sources**: D2 files in the `data/` directory containing network topology definitions
- `branch.d2` - Branch office network topology
- `campus.d2` - Campus network topology  
- `datacenter.d2` - Data center network topology

**Application Structure**:
- `index.html` - Main entry point with modular architecture using global functions
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks for data and state management
- `src/utils/` - Utility functions and parsers

## Development Commands

Since this is a static HTML/JavaScript application without a build system:

**Local Development**:
```bash
# Using npm scripts (recommended)
npm run start    # Uses npx serve .
npm run dev      # Uses python -m http.server 8000

# Alternative manual methods
python -m http.server 8000
npx serve .
php -S localhost:8000
```

**Accessing the application**: 
- Open `http://localhost:8000/index.html` in a browser

**Architecture Note**: The application uses a pseudo-modular approach where components are loaded as global functions via Babel script tags, allowing for separation of concerns without requiring a build system.

## Key Components

### Utilities (`src/utils/`)
- **`d2Parser.js`** - D2 syntax parser extracting devices, interfaces, and connections
- **`deviceUtils.js`** - Device type detection, icons, colors, and interface management
- **`layoutUtils.js`** - D3 layout algorithms and force simulation controls

### Custom Hooks (`src/hooks/`)
- **`useNetworkData.js`** - Manages D2 file loading, parsing, and error handling
- **`useVisualization.js`** - D3 force simulation setup and interaction handling

### Components (`src/components/`)
- **`DeviceDetailsPanel.js`** - Layer 2 device information and interface details
- **`Layer3Panel.js`** - Routing protocols, SVIs, and Layer 3 configuration
- **`ConnectionDetailsPanel.js`** - Link details and interface configuration comparison
- **`Modals.js`** - Access points modal and routing table modal

### Core Features
- **D3 Visualization Engine**: Force simulation for interactive node positioning
- **Curved Path Rendering**: Multiple connections between devices with curve offsets
- **Device Type Support**: Routers, switches, firewalls, wireless controllers
- **Interface Management**: Physical ports and SVIs with detailed configuration
- **Routing Information**: OSPF, BGP, static routes, and VRRP/HSRP status

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

**Interface Properties**:
- Physical interfaces (GigabitEthernet0/0/1, 1/0/24, etc.)
- SVI interfaces (vlan10, vlan20, etc.)
- Configuration includes VLANs, IP addressing, routing protocol settings

## File Organization

### Current Modular Structure
- **Components**: Separated into individual files in `src/components/`
- **Hooks**: Custom React hooks in `src/hooks/`
- **Utilities**: Pure functions and parsers in `src/utils/`
- **Entry Point**: `index.html` loads modules as global functions via Babel
- **No build process**: All files are loaded with `<script type="text/babel">` tags
- **App Logic**: Main React component is embedded in `index.html`
- **Mock file system**: API in HTML handles D2 file loading via fetch

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
- Place in `data/` directory 
- Update site loading logic in `useNetworkData.js`

**Modifying visualization**: 
- Update D3 rendering code in `useVisualization.js`
- Modify layout functions in `layoutUtils.js`

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