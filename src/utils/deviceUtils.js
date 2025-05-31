// Device utility functions for network topology visualization

// Helper function to determine device type from label
window.getTypeFromLabel = (label) => {
  const lower = label.toLowerCase();
  if (lower.includes("router") || lower.startsWith("r")) return "router";
  if (lower.includes("switch") || lower.startsWith("s")) return "switch";
  if (lower.includes("firewall") || lower.startsWith("f")) return "firewall";
  if (lower.includes("wlc") || lower.includes("wireless") || lower.startsWith("w"))
    return "wireless_controller";
  if (lower.includes("access point") || lower.includes("ap"))
    return "access_point";
  return "unknown";
};

// Get device icon based on type
window.getDeviceIcon = (type) => {
  const icons = {
    router: "🌐",
    switch: "⚡",
    firewall: "🛡️",
    wireless_controller: "📶",
    access_point: "📡",
    server: "🖥️",
    unknown: "❓",
  };
  return icons[type] || icons.unknown;
};

// Get device color based on type
window.getDeviceColor = (type) => {
  const colors = {
    router: "#E74C3C",
    switch: "#3498DB",
    firewall: "#E67E22",
    wireless_controller: "#9B59B6",
    access_point: "#1ABC9C",
    server: "#2ECC71",
    unknown: "#95A5A6",
  };
  return colors[type] || colors.unknown;
};

// Get device interfaces dynamically
window.getDeviceInterfaces = (deviceId, interfacesData) => {
  const deviceInterfaces = [];
  interfacesData.forEach((interfaceConfig, key) => {
    if (interfaceConfig.device === deviceId) {
      deviceInterfaces.push({
        name: interfaceConfig.interface,
        config: interfaceConfig.config,
      });
    }
  });
  return deviceInterfaces;
};

// Get device SVIs (Switched Virtual Interfaces) from D2 data only
window.getDeviceSVIs = (deviceId, deviceData) => {
  const svis = [];
  
  // Look for SVIs in the device.svis object
  if (deviceData && deviceData.svis) {
    Object.entries(deviceData.svis).forEach(([sviName, sviConfig]) => {
      svis.push({
        interface: sviName.toUpperCase(), // Convert vlan10 to VLAN10
        config: sviConfig
      });
    });
  }
  
  return svis;
};

// Get router Layer 3 interfaces with IP addresses
window.getRouterLayer3Interfaces = (deviceId, interfacesData) => {
  const layer3Interfaces = [];
  interfacesData.forEach((interfaceConfig, key) => {
    if (interfaceConfig.device === deviceId && interfaceConfig.config.ip_address) {
      layer3Interfaces.push({
        interface: interfaceConfig.interface,
        config: interfaceConfig.config
      });
    }
  });
  return layer3Interfaces;
};

// Parse static routes count
window.getStaticRoutesCount = (staticRoutesString) => {
  if (!staticRoutesString) return 0;
  return staticRoutesString.split(',').filter(route => route.trim()).length;
};

// Get VRRP interfaces
window.getVRRPInterfaces = (deviceId, deviceData, interfacesData) => {
  const vrrpInterfaces = [];
  
  // Check SVIs for VRRP configuration
  if (deviceData && deviceData.svis) {
    Object.entries(deviceData.svis).forEach(([sviName, sviConfig]) => {
      if (sviConfig.vrrp_group || sviConfig.vrrp_priority) {
        vrrpInterfaces.push({
          interface: sviName.toUpperCase(),
          vrrp_group: sviConfig.vrrp_group,
          vrrp_priority: sviConfig.vrrp_priority,
          virtual_ip: sviConfig.vrrp_virtual_ip
        });
      }
    });
  }
  
  // Check physical interfaces for VRRP
  interfacesData.forEach((interfaceConfig, key) => {
    if (interfaceConfig.device === deviceId && 
        (interfaceConfig.config.vrrp_group || interfaceConfig.config.vrrp_priority)) {
      vrrpInterfaces.push({
        interface: interfaceConfig.interface,
        vrrp_group: interfaceConfig.config.vrrp_group,
        vrrp_priority: interfaceConfig.config.vrrp_priority,
        virtual_ip: interfaceConfig.config.vrrp_virtual_ip
      });
    }
  });
  
  return vrrpInterfaces;
};

// Function to abbreviate interface names
const abbreviateInterfaceName = (name) => {
  if (!name) return name;
  
  // Common Cisco interface abbreviations
  const abbreviations = {
    'GigabitEthernet': 'Gi',
    'TenGigabitEthernet': 'Te',
    'FastEthernet': 'Fa',
    'Ethernet': 'E',
    'Serial': 'S',
    'Loopback': 'Lo',
    'Vlan': 'Vl',
    'Port-channel': 'Po',
    'Tunnel': 'Tu'
  };
  
  // Check each pattern and replace
  for (const [full, abbr] of Object.entries(abbreviations)) {
    if (name.startsWith(full)) {
      return name.replace(full, abbr);
    }
  }
  
  return name;
};

// Function to get interface mode indicator
const getInterfaceModeIndicator = (config) => {
  if (!config) return '';
  
  // Check if it's a routed interface (has IP but no switchport mode)
  if (config.ip_address && !config.switchport_mode) {
    return 'R';
  }
  
  // Check switchport mode
  if (config.switchport_mode === 'trunk') {
    return 'T';
  } else if (config.switchport_mode === 'access') {
    return 'A';
  }
  
  return '';
};

// Export all functions to window
window.getDeviceIcon = getDeviceIcon;
window.getDeviceColor = getDeviceColor;
window.getDeviceInterfaces = getDeviceInterfaces;
window.getDeviceSVIs = getDeviceSVIs;
window.getRouterLayer3Interfaces = getRouterLayer3Interfaces;
window.getVRRPInterfaces = getVRRPInterfaces;
window.getStaticRoutesCount = getStaticRoutesCount;
window.abbreviateInterfaceName = abbreviateInterfaceName;
window.getInterfaceModeIndicator = getInterfaceModeIndicator;