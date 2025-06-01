// Device details panel component for Layer 2 information

window.DeviceDetailsPanel = ({ selectedDevice, interfacesData }) => {
  if (!selectedDevice) return null;

  const [expandedInterfaces, setExpandedInterfaces] = React.useState({});
  
  const device = selectedDevice.device || {};
  const deviceType = selectedDevice.type;
  const deviceInterfaces = window.getDeviceInterfaces(selectedDevice.id, interfacesData);
  
  const toggleInterface = (ifaceName) => {
    setExpandedInterfaces(prev => ({
      ...prev,
      [ifaceName]: !prev[ifaceName]
    }));
  };

  // Filter out routing-related properties for Layer 2 focus
  const layer2Properties = Object.entries(device).filter(([key]) => 
    !key.includes('ospf') && 
    !key.includes('bgp') && 
    !key.includes('routing') && 
    !key.includes('vrrp') && 
    !key.includes('static_routes') && 
    !key.includes('default_gateway') &&
    !key.includes('dhcp') && // Exclude DHCP-related properties
    key !== 'svis' &&
    key !== 'mgmt_ip' // Exclude mgmt_ip since it's shown explicitly above
  );

  return (
    <div>
      {/* Device Properties - Layer 2 focused */}
      <div className="bg-gray-700 p-3">
        <h4 className="font-medium mb-1 text-gray-100 flex items-center gap-2">
          <span className="text-xl">{window.getDeviceIcon(deviceType)}</span>
          {selectedDevice.label || selectedDevice.id}
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Device Type:</span>
            <span className="text-gray-300 capitalize">{deviceType}</span>
          </div>
          {device.mgmt_ip && (
            <div className="flex justify-between">
              <span className="text-gray-400">Management IP:</span>
              <span className="text-gray-300 font-mono">{device.mgmt_ip}</span>
            </div>
          )}
          {layer2Properties.map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400 capitalize">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="text-gray-300">
                {typeof value === 'object' ? JSON.stringify(value) : value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Interface Information - Layer 2 focused */}
      {deviceInterfaces.length > 0 && (
        <div className="bg-blue-900/20 border-t-4 border-t-blue-600 p-3">
          <h4 className="font-medium mb-2 text-blue-100 flex items-center gap-2">
            🔌 Physical Interfaces
            <span className="text-xs bg-blue-800/60 px-2 py-1 rounded">
              {deviceInterfaces.length} ports
            </span>
          </h4>
          <div className="text-sm space-y-1 mb-1">
            <div className="flex justify-between">
              <span className="text-blue-300">Total Interfaces:</span>
              <span className="text-blue-100">{deviceInterfaces.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-300">Active Interfaces:</span>
              <span className="text-green-300">{deviceInterfaces.filter(i => i.config.status === "up").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-300">Down Interfaces:</span>
              <span className="text-red-300">{deviceInterfaces.filter(i => i.config.status === "down").length}</span>
            </div>
          </div>
          
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {deviceInterfaces.map((iface, index) => {
              const isExpanded = expandedInterfaces[iface.name];
              const abbreviatedName = window.abbreviateInterfaceName(iface.name);
              const modeIndicator = window.getInterfaceModeIndicator(iface.config);
              
              return (
                <div key={index} className="border-l-4 transition-all"
                     style={{borderLeftColor: iface.config.status === "up" ? "#10B981" : "#EF4444"}}>
                  <div 
                    className="bg-blue-800/20 p-2 cursor-pointer hover:bg-blue-800/30 transition-colors"
                    onClick={() => toggleInterface(iface.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-gray-400 text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <span className="font-mono text-blue-100 text-sm font-semibold">
                          {abbreviatedName}
                        </span>
                        {modeIndicator && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-blue-700 text-blue-200">
                            {modeIndicator}
                          </span>
                        )}
                        {iface.config.description && (
                          <span className="text-xs text-blue-300 italic truncate flex-1">
                            {iface.config.description}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded font-medium ml-2 ${
                        iface.config.status === "up" 
                          ? "bg-green-800 text-green-200" 
                          : "bg-red-800 text-red-200"
                      }`}>
                        {iface.config.status?.toUpperCase() || "Unknown"}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-blue-900/10 p-2 border-t border-blue-700/30">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {iface.config.bandwidth && (
                          <div>
                            <span className="text-blue-400">Speed:</span>
                            <span className="text-blue-200 ml-1">{iface.config.bandwidth}</span>
                          </div>
                        )}
                        {iface.config.switchport_mode && (
                          <div>
                            <span className="text-blue-400">Mode:</span>
                            <span className="text-blue-200 ml-1">{iface.config.switchport_mode}</span>
                          </div>
                        )}
                        {iface.config.access_vlan && (
                          <div>
                            <span className="text-blue-400">Access VLAN:</span>
                            <span className="text-yellow-300 ml-1">{iface.config.access_vlan}</span>
                          </div>
                        )}
                        {iface.config.native_vlan && (
                          <div>
                            <span className="text-blue-400">Native VLAN:</span>
                            <span className="text-yellow-300 ml-1">{iface.config.native_vlan}</span>
                          </div>
                        )}
                        {iface.config.allowed_vlans && (
                          <div className="col-span-2">
                            <span className="text-blue-400">Allowed VLANs:</span>
                            <span className="text-yellow-300 ml-1">{iface.config.allowed_vlans}</span>
                          </div>
                        )}
                        {iface.config.ip_address && (
                          <div className="col-span-2">
                            <span className="text-blue-400">IP Address:</span>
                            <span className="text-blue-200 ml-1 font-mono">
                              {iface.config.subnet_mask ? 
                                `${iface.config.ip_address}/${window.subnetMaskToCIDR(iface.config.subnet_mask)}` :
                                iface.config.ip_address
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Device-specific sections have been moved to Layer 3 panel */}
    </div>
  );
};