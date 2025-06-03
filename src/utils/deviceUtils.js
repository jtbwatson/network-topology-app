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
  if (lower.includes("isp") || lower.includes("wan") || lower.includes("provider"))
    return "wan";
  if (lower.includes("internet") || lower.includes("inet"))
    return "internet";
  if (lower.includes("mpls") || lower.includes("private"))
    return "mpls";
  if (lower.includes("external") || lower.includes("cloud"))
    return "external";
  return "unknown";
};

// Get device icon based on type - returns path to SVG file
window.getDeviceIcon = (type) => {
  const iconMap = {
    router: 'assets/icons/router.svg',
    switch: 'assets/icons/switch.svg', 
    firewall: 'assets/icons/firewall.svg',
    wireless_controller: 'assets/icons/wifi.svg',
    access_point: 'assets/icons/wifi.svg',
    server: 'assets/icons/router.svg',
    external: 'assets/icons/cloud.svg',
    wan: 'assets/icons/cloud.svg',
    wan_provider: 'assets/icons/cloud.svg',
    internet: 'assets/icons/cloud.svg',
    mpls: 'assets/icons/cloud.svg',
    unknown: 'assets/icons/router.svg',
  };
  
  return iconMap[type] || iconMap.unknown;
};

// Get device color based on type
window.getDeviceColor = (type) => {
  const colors = {
    router: "#0EA5E9",
    switch: "#22C55E",
    firewall: "#F97316",
    wireless_controller: "#8B5CF6",
    access_point: "#14B8A6",
    server: "#16A34A",
    external: "#EAB308",
    wan: "#EAB308",
    wan_provider: "#EAB308",
    internet: "#3B82F6",
    mpls: "#6B7280",
    unknown: "#6B7280",
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
  
  // Common Cisco and Aruba interface abbreviations
  const abbreviations = {
    'GigabitEthernet': 'Gi',
    'TenGigabitEthernet': 'Te',
    'FastEthernet': 'Fa',
    'Ethernet': 'E',
    'Serial': 'S',
    'Loopback': 'Lo',
    'Vlan': 'Vl',
    'Port-channel': 'Po',
    'Tunnel': 'Tu',
    'lag ': 'LAG'  // Aruba LAG interfaces
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
  
  // Check if it's a port channel (Cisco Port-channel or Aruba LAG)
  if (config.protocol === 'LACP' || config.members || config.port_channel === 'true') {
    return 'PC';
  }
  
  // Check if it's a port channel member
  if (config.channel_group) {
    return 'M';
  }
  
  // Check if it's explicitly configured as routed
  if (config.switchport_mode === 'routed') {
    return 'R';
  }
  
  // Check if it's a routed interface (has IP but no switchport mode or switchport mode is routed)
  if (config.ip_address && (!config.switchport_mode || config.switchport_mode === 'routed')) {
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
// Function to convert subnet mask to CIDR notation
const subnetMaskToCIDR = (subnetMask) => {
  if (!subnetMask) return '';
  
  // Convert common subnet masks to CIDR
  const subnetMap = {
    '255.255.255.255': '32',
    '255.255.255.254': '31',
    '255.255.255.252': '30',
    '255.255.255.248': '29',
    '255.255.255.240': '28',
    '255.255.255.224': '27',
    '255.255.255.192': '26',
    '255.255.255.128': '25',
    '255.255.255.0': '24',
    '255.255.254.0': '23',
    '255.255.252.0': '22',
    '255.255.248.0': '21',
    '255.255.240.0': '20',
    '255.255.224.0': '19',
    '255.255.192.0': '18',
    '255.255.128.0': '17',
    '255.255.0.0': '16',
    '255.254.0.0': '15',
    '255.252.0.0': '14',
    '255.248.0.0': '13',
    '255.240.0.0': '12',
    '255.224.0.0': '11',
    '255.192.0.0': '10',
    '255.128.0.0': '9',
    '255.0.0.0': '8'
  };
  
  return subnetMap[subnetMask] || subnetMask;
};

window.getRouterLayer3Interfaces = getRouterLayer3Interfaces;
window.getVRRPInterfaces = getVRRPInterfaces;
window.getStaticRoutesCount = getStaticRoutesCount;
window.abbreviateInterfaceName = abbreviateInterfaceName;
window.getInterfaceModeIndicator = getInterfaceModeIndicator;
window.subnetMaskToCIDR = subnetMaskToCIDR;