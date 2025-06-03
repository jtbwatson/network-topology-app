// D2 Parser utilities for network topology visualization

window.extractSiteInfoFromD2 = (d2Content, defaultName) => {
  const lines = d2Content
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"));
  
  let deviceCount = 0;
  let wirelessControllerCount = 0;
  let location = "Unknown";
  let siteName = defaultName;
  
  // Count devices and extract info from D2 content
  const deviceTypes = new Set();
  
  lines.forEach((line) => {
    const trimmed = line.trim();
    
    // Count device definitions (top-level objects with labels)
    if (trimmed.includes(": {") && !trimmed.includes("->") && !trimmed.includes("/")) {
      deviceCount++;
    }
    
    // Extract device types
    if (trimmed.startsWith("type:")) {
      const typeMatch = trimmed.match(/type:\s*"([^"]+)"/) || trimmed.match(/type:\s*(\w+)/);
      if (typeMatch) {
        const deviceType = typeMatch[1];
        deviceTypes.add(deviceType);
        if (deviceType === "wireless_controller") {
          wirelessControllerCount++;
        }
      }
    }
    
    // Try to extract location from comments or other indicators
    if (trimmed.includes("# ") && (trimmed.includes("Site") || trimmed.includes("Network"))) {
      const match = trimmed.match(/# (.+)/);
      if (match) {
        siteName = match[1].replace(" - Complete Connection Data", "").trim();
      }
    }
  });

  // Estimate AP count based on wireless controllers (typical ratio)
  const estimatedApCount = wirelessControllerCount * 12; // Typical WLC can handle 12-50 APs

  // Determine location based on site characteristics
  if (deviceTypes.has("router") && deviceTypes.has("firewall") && deviceCount > 10) {
    location = "Primary Data Center";
  } else if (wirelessControllerCount > 1 && deviceCount > 8) {
    location = "Main Campus";
  } else if (deviceCount < 8) {
    location = "Remote Branch Office";
  }

  return {
    name: siteName,
    location: location,
    devices_count: deviceCount,
    aps_count: estimatedApCount,
    device_types: Array.from(deviceTypes),
  };
};

window.parseD2ToGraph = (d2String) => {
  console.log("🔍 Raw D2 content:", d2String.substring(0, 500) + "...");

  const lines = d2String
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("#"));
  const nodes = new Map();
  const links = [];
  const interfaces = new Map(); // Store interface configurations

  let currentDeviceId = null;
  let currentInterfaceId = null;
  let currentSviId = null;
  let isInDeviceDef = false;
  let isInInterfaceDef = false;
  let isInSviDef = false;
  let braceDepth = 0;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    console.log(`Line ${index}: "${trimmed}"`);

    // Count braces to track nesting depth
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;

    // Device definition start (top-level object with label/type)
    if (
      trimmed.includes(": {") &&
      braceDepth === 1 &&
      !trimmed.includes("->") &&
      !trimmed.includes("/")
    ) {
      const deviceId = trimmed.split(":")[0].trim();
      currentDeviceId = deviceId;
      isInDeviceDef = true;
      isInInterfaceDef = false;
      isInSviDef = false;
      console.log(`📱 Found device definition: ${deviceId}`);
    }

    // Interface definition (nested under device)
    else if (
      trimmed.includes(": {") &&
      braceDepth === 2 &&
      currentDeviceId &&
      (trimmed.includes("/") || trimmed.toLowerCase().includes("port") || trimmed.toLowerCase().includes("ethernet") || trimmed.toLowerCase().includes("channel") || trimmed.toLowerCase().includes("gigabit"))
    ) {
      const interfaceId = trimmed.split(":")[0].trim();
      currentInterfaceId = interfaceId;
      currentSviId = null;
      isInInterfaceDef = true;
      isInSviDef = false;
      const fullInterfaceKey = `${currentDeviceId}.${interfaceId}`;

      if (!interfaces.has(fullInterfaceKey)) {
        interfaces.set(fullInterfaceKey, {
          device: currentDeviceId,
          interface: interfaceId,
          config: {},
        });
      }
      console.log(`🔌 Found interface definition: ${fullInterfaceKey}`);
    }

    // SVI definition (nested under device, starts with vlan)
    else if (
      trimmed.includes(": {") &&
      braceDepth === 2 &&
      currentDeviceId &&
      trimmed.toLowerCase().startsWith("vlan")
    ) {
      const sviId = trimmed.split(":")[0].trim();
      currentSviId = sviId;
      currentInterfaceId = null;
      isInSviDef = true;
      isInInterfaceDef = false;
      console.log(`🔗 Found SVI definition: ${currentDeviceId}.${sviId}`);

      // Initialize SVI in device data
      if (currentDeviceId && nodes.has(currentDeviceId)) {
        const node = nodes.get(currentDeviceId);
        if (!node.device.svis) {
          node.device.svis = {};
        }
        node.device.svis[sviId] = {};
      }
    }

    // Extract device properties
    else if (
      isInDeviceDef &&
      !isInInterfaceDef &&
      !isInSviDef &&
      braceDepth >= 1 &&
      trimmed.includes(":") &&
      !trimmed.includes("{")
    ) {
      if (trimmed.startsWith("label:")) {
        const labelMatch = trimmed.match(/label:\s*"([^"]+)"/);
        const label = labelMatch ? labelMatch[1] : currentDeviceId;

        if (currentDeviceId && !nodes.has(currentDeviceId)) {
          console.log(
            `🏷️ Creating device node: ${currentDeviceId} with label: ${label}`
          );
          nodes.set(currentDeviceId, {
            id: currentDeviceId,
            label: label,
            device: {}, // Initialize empty device object
            type: "unknown",
          });
        }
      } else if (trimmed.startsWith("type:")) {
        const typeMatch =
          trimmed.match(/type:\s*"([^"]+)"/) ||
          trimmed.match(/type:\s*(\w+)/);
        const deviceType = typeMatch ? typeMatch[1] : "unknown";

        if (currentDeviceId && nodes.has(currentDeviceId)) {
          const node = nodes.get(currentDeviceId);
          node.type = deviceType;
          console.log(
            `🔧 Set device type: ${currentDeviceId} = ${deviceType}`
          );
        }
      } 
      // Dynamically capture any other device properties
      else {
        const [key, value] = trimmed.split(":", 2).map((s) => s.trim());
        const cleanValue = value.replace(/"/g, ""); // Remove quotes

        if (currentDeviceId && nodes.has(currentDeviceId)) {
          const node = nodes.get(currentDeviceId);
          node.device[key] = cleanValue;
          console.log(`📊 Set device property: ${currentDeviceId}.${key} = ${cleanValue}`);
        }
      }
    }

    // Extract interface configuration
    else if (
      isInInterfaceDef &&
      braceDepth >= 2 &&
      trimmed.includes(":") &&
      !trimmed.includes("{")
    ) {
      const fullInterfaceKey = `${currentDeviceId}.${currentInterfaceId}`;
      const interfaceData = interfaces.get(fullInterfaceKey);

      if (interfaceData) {
        const [key, value] = trimmed.split(":", 2).map((s) => s.trim());
        const cleanValue = value.replace(/"/g, ""); // Remove quotes
        interfaceData.config[key] = cleanValue;
        console.log(
          `⚙️ Set interface config: ${fullInterfaceKey}.${key} = ${cleanValue}`
        );
      }
    }

    // Extract SVI configuration
    else if (
      isInSviDef &&
      braceDepth >= 2 &&
      trimmed.includes(":") &&
      !trimmed.includes("{")
    ) {
      const [key, value] = trimmed.split(":", 2).map((s) => s.trim());
      const cleanValue = value.replace(/"/g, ""); // Remove quotes

      if (currentDeviceId && currentSviId && nodes.has(currentDeviceId)) {
        const node = nodes.get(currentDeviceId);
        if (!node.device.svis) {
          node.device.svis = {};
        }
        if (!node.device.svis[currentSviId]) {
          node.device.svis[currentSviId] = {};
        }
        node.device.svis[currentSviId][key] = cleanValue;
        console.log(`🔗 Set SVI config: ${currentDeviceId}.${currentSviId}.${key} = ${cleanValue}`);
      }
    }

    // Connection definitions (simple format)
    else if (
      trimmed.includes("->") &&
      !trimmed.includes("{") &&
      !trimmed.includes(":")
    ) {
      const [source, target] = trimmed.split("->").map((s) => s.trim());
      if (source && target) {
        // Extract device names and interfaces from full references
        const sourceDevice = source.split(".")[0];
        const sourceInterface = source.split(".").slice(1).join(".");
        const targetDevice = target.split(".")[0];
        const targetInterface = target.split(".").slice(1).join(".");

        if (sourceDevice && targetDevice) {
          links.push({
            source: sourceDevice,
            target: targetDevice,
            sourceInterface: sourceInterface,
            targetInterface: targetInterface,
            sourceInterfaceKey: source,
            targetInterfaceKey: target,
          });
          console.log(
            `🔗 Found connection: ${sourceDevice}[${sourceInterface}] → ${targetDevice}[${targetInterface}]`
          );
        }
      }
    }

    // Reset when we exit definitions
    if (braceDepth === 0) {
      isInDeviceDef = false;
      isInInterfaceDef = false;
      isInSviDef = false;
      currentDeviceId = null;
      currentInterfaceId = null;
      currentSviId = null;
    } else if (braceDepth === 1) {
      isInInterfaceDef = false;
      isInSviDef = false;
      currentInterfaceId = null;
      currentSviId = null;
    }
  });

  console.log(`🔗 Total connections found: ${links.length}`);
  console.log(`📱 Total devices found: ${nodes.size}`);
  console.log(`🔌 Total interfaces found: ${interfaces.size}`);

  const nodeList = Array.from(nodes.values());

  console.log(
    "🎯 Final parsed nodes:",
    nodeList.map((n) => ({ id: n.id, label: n.label, type: n.type, svis: n.device.svis }))
  );
  console.log("🔗 Final parsed links:", links);
  console.log(
    "🔌 Interface configurations:",
    Array.from(interfaces.entries())
  );

  return {
    nodes: nodeList,
    links: links,
    interfaces: interfaces,
  };
};