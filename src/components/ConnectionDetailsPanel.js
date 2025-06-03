// Connection details panel component

window.ConnectionDetailsPanel = ({ 
  selectedConnection, 
  interfacesData, 
  setSelectedConnection, 
  setSelectedDevice 
}) => {
  if (!selectedConnection) return null;

  // Try to get interface configs with robust key matching
  let sourceInterfaceConfig = interfacesData.get(selectedConnection.sourceInterfaceKey);
  let targetInterfaceConfig = interfacesData.get(selectedConnection.targetInterfaceKey);

  // Fallback: if direct key lookup fails, try alternative key formats
  if (!sourceInterfaceConfig) {
    const altSourceKey = `${selectedConnection.source.id}.${selectedConnection.sourceInterface}`;
    sourceInterfaceConfig = interfacesData.get(altSourceKey);
  }

  if (!targetInterfaceConfig) {
    const altTargetKey = `${selectedConnection.target.id}.${selectedConnection.targetInterface}`;
    targetInterfaceConfig = interfacesData.get(altTargetKey);
  }

  return (
    <div>
      {/* Connection Header */}
      <div className="bg-gray-700 p-3">
        <h4 className="font-medium mb-1 text-gray-100 flex items-center gap-2">
          🔗 Connection Details
        </h4>
        <div className="text-xs text-gray-400 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-blue-300">{selectedConnection.source.label}</span>
            <span className="text-green-400">↔</span>
            <span className="text-blue-300">{selectedConnection.target.label}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-gray-300">
            <span>{window.abbreviateInterfaceName(selectedConnection.sourceInterface)}</span>
            <span>to</span>
            <span>{window.abbreviateInterfaceName(selectedConnection.targetInterface)}</span>
          </div>
        </div>
      </div>

      {/* Source Device & Interface */}
      <InterfaceDetailsCard
        device={selectedConnection.source}
        interfaceName={selectedConnection.sourceInterface}
        interfaceConfig={sourceInterfaceConfig}
        cardColor="blue"
      />

      {/* Target Device & Interface */}
      <InterfaceDetailsCard
        device={selectedConnection.target}
        interfaceName={selectedConnection.targetInterface}
        interfaceConfig={targetInterfaceConfig}
        cardColor="emerald"
      />

      {/* Back to Device Details Button */}
      <div className="p-3 border-t border-gray-600">
        <button
          onClick={() => {
            setSelectedConnection(null);
            setSelectedDevice(null);
          }}
          className="w-full p-2 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs font-medium transition-colors"
        >
          ← Back to Overview
        </button>
      </div>
    </div>
  );
};

const InterfaceDetailsCard = ({ device, interfaceName, interfaceConfig, cardColor }) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-900/20 border-blue-600/50",
      text: "text-blue-100",
      accent: "text-blue-300",
      interfaceBg: "bg-blue-800/20 border-blue-700/50",
      configBg: "bg-blue-800/20 border-blue-700/50"
    },
    emerald: {
      bg: "bg-emerald-900/20 border-emerald-600/50",
      text: "text-emerald-100",
      accent: "text-emerald-300",
      interfaceBg: "bg-emerald-800/20 border-emerald-700/50",
      configBg: "bg-emerald-800/20 border-emerald-700/50"
    }
  };

  const colors = colorClasses[cardColor];

  return (
    <div className={`${colors.bg} border-t-4`} style={{borderTopColor: cardColor === 'blue' ? '#3B82F6' : '#10B981'}}>
      <div className="px-3 pt-3 pb-1">
        <h4 className={`font-medium ${colors.text} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <img 
              src={window.getDeviceIcon(device.type)} 
              alt={device.type}
              className="w-5 h-5"
            />
            {device.label}
          </div>
          <div className={`text-sm ${colors.accent} font-mono font-bold`}>
            {window.abbreviateInterfaceName(interfaceName)}
          </div>
        </h4>
      </div>

      {interfaceConfig?.config ? (
        <div className="px-3 pb-3">
          <div className={`text-xs ${colors.text} space-y-1`}>
            {interfaceConfig.config.description && (
              <div className="flex justify-between">
                <span className={colors.accent}>Description:</span> 
                <span className="italic">{interfaceConfig.config.description}</span>
              </div>
            )}
            
            {interfaceConfig.config.status && (
              <div className="flex justify-between">
                <span className={colors.accent}>Status:</span> 
                <span className={`font-semibold ${
                  interfaceConfig.config.status === "up" ? "text-green-300" : "text-red-300"
                }`}>
                  {interfaceConfig.config.status.toUpperCase()}
                </span>
              </div>
            )}
            
            {interfaceConfig.config.bandwidth && (
              <div className="flex justify-between">
                <span className={colors.accent}>Bandwidth:</span> 
                <span>{interfaceConfig.config.bandwidth}</span>
              </div>
            )}

            {/* Interface Configuration - different for routed vs switched */}
            {interfaceConfig.config.switchport_mode === 'routed' ? (
              /* Routed Interface Configuration */
              <>
                <div className="flex justify-between">
                  <span className={colors.accent}>Mode:</span> 
                  <span>Routed (Layer 3)</span>
                </div>
                {interfaceConfig.config.ip_address && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>IP Address:</span> 
                    <span className="font-mono">
                      {interfaceConfig.config.subnet_mask ? 
                        `${interfaceConfig.config.ip_address}/${window.subnetMaskToCIDR(interfaceConfig.config.subnet_mask)}` :
                        interfaceConfig.config.ip_address
                      }
                    </span>
                  </div>
                )}
                {interfaceConfig.config.ospf_area && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>OSPF Area:</span> 
                    <span className="font-mono">{interfaceConfig.config.ospf_area}</span>
                  </div>
                )}
                {interfaceConfig.config.ospf_cost && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>OSPF Cost:</span> 
                    <span className="font-mono">{interfaceConfig.config.ospf_cost}</span>
                  </div>
                )}
                {interfaceConfig.config.ospf_network_type && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>OSPF Type:</span> 
                    <span className="font-mono">{interfaceConfig.config.ospf_network_type}</span>
                  </div>
                )}
              </>
            ) : (interfaceConfig.config.switchport_mode || interfaceConfig.config.native_vlan || interfaceConfig.config.access_vlan) ? (
              /* Switched Interface Configuration */
              <>
                {interfaceConfig.config.switchport_mode && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>Mode:</span> 
                    <span>{interfaceConfig.config.switchport_mode.charAt(0).toUpperCase() + interfaceConfig.config.switchport_mode.slice(1)}</span>
                  </div>
                )}
                {interfaceConfig.config.native_vlan && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>Native VLAN:</span> 
                    <span className="font-mono">{interfaceConfig.config.native_vlan}</span>
                  </div>
                )}
                {interfaceConfig.config.access_vlan && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>Access VLAN:</span> 
                    <span className="font-mono">{interfaceConfig.config.access_vlan}</span>
                  </div>
                )}
                {interfaceConfig.config.allowed_vlans && (
                  <div className="flex justify-between">
                    <span className={colors.accent}>Allowed VLANs:</span> 
                    <span className="font-mono">{interfaceConfig.config.allowed_vlans}</span>
                  </div>
                )}
              </>
            ) : null}

            {/* Port Channel Information */}
            {interfaceConfig.config.protocol && (
              <div className="flex justify-between">
                <span className={colors.accent}>Protocol:</span> 
                <span className="font-semibold text-green-300">{interfaceConfig.config.protocol}</span>
              </div>
            )}
            {interfaceConfig.config.members && (
              <div className="flex justify-between">
                <span className={colors.accent}>Members:</span> 
                <span className="font-mono text-green-300">{interfaceConfig.config.members}</span>
              </div>
            )}
            {interfaceConfig.config.channel_group && (
              <div className="flex justify-between">
                <span className={colors.accent}>Channel Group:</span> 
                <span className="text-green-300">{interfaceConfig.config.channel_group}</span>
              </div>
            )}
            {interfaceConfig.config.load_balancing && (
              <div className="flex justify-between">
                <span className={colors.accent}>Load Balancing:</span> 
                <span className="text-green-300">{interfaceConfig.config.load_balancing}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="px-3 pb-3">
          <div className={`text-center py-4 ${colors.accent}/60 text-xs`}>
            📄 No config data
          </div>
        </div>
      )}
    </div>
  );
};