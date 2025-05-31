// Connection details panel component

window.ConnectionDetailsPanel = ({ 
  selectedConnection, 
  interfacesData, 
  setSelectedConnection, 
  setSelectedDevice 
}) => {
  if (!selectedConnection) return null;

  const sourceInterfaceConfig = interfacesData.get(selectedConnection.sourceInterfaceKey);
  const targetInterfaceConfig = interfacesData.get(selectedConnection.targetInterfaceKey);

  return (
    <div className="space-y-3">
      {/* Connection Header */}
      <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
        <h3 className="font-semibold text-lg text-gray-100 mb-2">
          🔗 Connection Details
        </h3>
        <div className="text-sm bg-gray-600 p-2 rounded font-mono">
          <div className="flex items-center justify-between">
            <span className="text-blue-300">{selectedConnection.source.label}</span>
            <span className="text-green-400">↔</span>
            <span className="text-blue-300">{selectedConnection.target.label}</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-300">
            <span>{selectedConnection.sourceInterface}</span>
            <span>to</span>
            <span>{selectedConnection.targetInterface}</span>
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
      <button
        onClick={() => {
          setSelectedConnection(null);
          setSelectedDevice(null);
        }}
        className="w-full p-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md text-sm font-medium transition-colors"
      >
        ← Back to Overview
      </button>
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
    <div className={`${colors.bg} border p-4 rounded-lg`}>
      <h4 className={`font-semibold mb-2 ${colors.text} flex items-center`}>
        <span className="text-xl mr-2">
          {window.getDeviceIcon(device.type)}
        </span>
        {device.label}
      </h4>
      
      <div className={`${colors.interfaceBg} p-2 rounded mb-2 border`}>
        <div className={`text-xs ${colors.accent} uppercase tracking-wide font-semibold mb-1`}>
          Interface
        </div>
        <div className={`${colors.text} font-mono text-sm`}>
          {interfaceName}
        </div>
      </div>

      {interfaceConfig?.config ? (
        <div className="space-y-2">
          {interfaceConfig.config.description && (
            <div className={`${colors.configBg} p-2 rounded border`}>
              <div className={`text-xs ${colors.accent} font-semibold mb-1`}>Description</div>
              <div className={`${colors.text} text-sm`}>{interfaceConfig.config.description}</div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            {interfaceConfig.config.status && (
              <div className={`${colors.configBg} p-2 rounded border`}>
                <div className={`text-xs ${colors.accent} font-semibold mb-1`}>Status</div>
                <div className={`text-sm font-semibold ${
                  interfaceConfig.config.status === "up" ? "text-green-300" : "text-red-300"
                }`}>
                  {interfaceConfig.config.status.toUpperCase()}
                </div>
              </div>
            )}
            
            {interfaceConfig.config.bandwidth && (
              <div className={`${colors.configBg} p-2 rounded border`}>
                <div className={`text-xs ${colors.accent} font-semibold mb-1`}>Bandwidth</div>
                <div className={`${colors.text} text-sm font-mono`}>
                  {interfaceConfig.config.bandwidth}
                </div>
              </div>
            )}
          </div>

          {(interfaceConfig.config.switchport_mode || interfaceConfig.config.native_vlan || interfaceConfig.config.access_vlan) && (
            <div className={`${colors.configBg} p-2 rounded border`}>
              <div className={`text-xs ${colors.accent} font-semibold mb-1`}>Configuration</div>
              <div className={`${colors.text} text-sm space-y-1`}>
                {interfaceConfig.config.switchport_mode && (
                  <div><span className={colors.accent}>Mode:</span> {interfaceConfig.config.switchport_mode}</div>
                )}
                {interfaceConfig.config.native_vlan && (
                  <div><span className={colors.accent}>Native VLAN:</span> {interfaceConfig.config.native_vlan}</div>
                )}
                {interfaceConfig.config.access_vlan && (
                  <div><span className={colors.accent}>Access VLAN:</span> {interfaceConfig.config.access_vlan}</div>
                )}
                {interfaceConfig.config.allowed_vlans && (
                  <div><span className={colors.accent}>Allowed VLANs:</span> {interfaceConfig.config.allowed_vlans}</div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-center py-6 ${colors.accent}/60`}>
          <div className="text-2xl mb-1">📄</div>
          <div className="text-sm">No config data</div>
        </div>
      )}
    </div>
  );
};