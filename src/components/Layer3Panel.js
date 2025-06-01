// Layer 3 information panel component

window.Layer3Panel = ({ selectedDevice, selectedConnection, interfacesData, setShowRoutingTableModal }) => {
  // Always render the panel, but show different content based on selection
  
  return (
    <div className="w-80 bg-gray-800 shadow-lg border-l border-gray-700 overflow-y-auto h-full">
      <div>
        {/* Upper Section - Layer 3 Information */}
        <div className="bg-gray-700 p-3">
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <span className="text-2xl">🌐</span>
            Layer 3 Information
          </h2>
          <p className="text-sm text-gray-400 mt-1">Routing & IP Configuration</p>
        </div>

        <div className="">
          {selectedDevice ? (
            <>
              {(() => {
                const deviceSVIs = window.getDeviceSVIs(selectedDevice.id, selectedDevice.device);
                const routerLayer3Interfaces = window.getRouterLayer3Interfaces(selectedDevice.id, interfacesData);
                const vrrpInterfaces = window.getVRRPInterfaces(selectedDevice.id, selectedDevice.device, interfacesData);
                const deviceInterfaces = window.getDeviceInterfaces(selectedDevice.id, interfacesData);
                const deviceType = selectedDevice.type;
                const device = selectedDevice.device || {};
                const staticRoutesCount = window.getStaticRoutesCount(device.static_routes);

                return (
                  <>
                    {/* Device-specific Layer 3 Information */}
                    {/* Routing Protocol Information */}
                    {(deviceType === "router" || deviceType === "switch") && (
                      <RoutingProtocolsSection device={device} setShowRoutingTableModal={setShowRoutingTableModal} staticRoutesCount={staticRoutesCount} />
                    )}

                    {/* VRRP/HSRP Information */}
                    {(deviceType === "router" || deviceType === "switch") && (device.vrrp_status || device.hsrp_enabled || vrrpInterfaces.length > 0) && (
                      <HighAvailabilitySection device={device} vrrpInterfaces={vrrpInterfaces} />
                    )}

                    {/* Layer 3 Interfaces - Different for Routers vs Switches */}
                    {deviceType === "router" && routerLayer3Interfaces.length > 0 && (
                      <RouterLayer3Interfaces routerLayer3Interfaces={routerLayer3Interfaces} />
                    )}

                    {/* SVI Information for Switches Only */}
                    {deviceType === "switch" && (
                      <SwitchSVISection deviceSVIs={deviceSVIs} />
                    )}

                    {/* Firewall Security Zones (Layer 3 related) */}
                    {deviceType === "firewall" && (
                      <FirewallSecurityZones />
                    )}

                    {/* Device-Specific Features Header */}
                    <div className="bg-gray-700 p-3 border-t-4 border-gray-600">
                      <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                        <span className="text-2xl">🔧</span>
                        Device-Specific Features
                      </h2>
                    </div>

                    {/* Lower Section - Device-Specific Features */}
                    <div>
                      {/* Router-specific features */}
                      {deviceType === "router" && (
                        <RouterSpecificFeatures device={device} deviceInterfaces={deviceInterfaces} />
                      )}

                      {/* Switch-specific features */}
                      {deviceType === "switch" && (
                        <SwitchSpecificFeatures device={device} deviceInterfaces={deviceInterfaces} />
                      )}

                      {/* Firewall-specific features */}
                      {deviceType === "firewall" && (
                        <FirewallSpecificFeatures device={device} />
                      )}

                      {/* Wireless Controller features */}
                      {deviceType === "wireless_controller" && (
                        <WirelessControllerFeatures device={device} />
                      )}
                    </div>
                  </>
                );
              })()}
            </>
          ) : selectedConnection ? (
            /* Connection Layer 3 Information */
            <div className="p-4">
              <div className="text-center text-gray-400">
                <div className="text-3xl mb-2">🔗</div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Connection Selected</h3>
                <p className="text-sm">View Layer 3 details in the left panel</p>
              </div>
            </div>
          ) : (
            /* Default state - no selection */
            <div className="p-4">
              <div className="text-center text-gray-400">
                <div className="text-4xl mb-4">📡</div>
                <h3 className="text-lg font-semibold text-gray-200 mb-2">No Selection</h3>
                <p className="text-sm mb-2">Click on a device to view Layer 3 information</p>
                <div className="text-xs text-gray-500 space-y-1">
                  <div>• Routing protocols (OSPF, BGP)</div>
                  <div>• VRRP/HSRP status</div>
                  <div>• Layer 3 interfaces & SVIs</div>
                  <div>• Static routes</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const RoutingProtocolsSection = ({ device, setShowRoutingTableModal, staticRoutesCount }) => (
  <div>
    <div className="bg-amber-900/20 border-t-4 border-t-amber-600 p-3">
      <h3 className="font-semibold mb-1 text-amber-100 flex items-center gap-2">
        🔄 Routing Protocols
      </h3>
      
      <div className="space-y-1 text-sm">
        {/* OSPF Information */}
        <div className="bg-amber-800/20 p-2 border-l-4 border-l-amber-700">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-amber-100">OSPF</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              device.ospf_enabled === "true" ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"
            }`}>
              {device.ospf_enabled === "true" ? "ENABLED" : "DISABLED"}
            </span>
          </div>
          
          {device.ospf_enabled === "true" && (
            <div className="space-y-1 text-xs">
              {device.ospf_router_id && (
                <div className="flex justify-between">
                  <span className="text-amber-300">Router ID:</span>
                  <span className="text-amber-100 font-mono">{device.ospf_router_id}</span>
                </div>
              )}
              {device.ospf_process_id && (
                <div className="flex justify-between">
                  <span className="text-amber-300">Process ID:</span>
                  <span className="text-amber-100">{device.ospf_process_id}</span>
                </div>
              )}
              {device.ospf_areas && (
                <div className="flex justify-between">
                  <span className="text-amber-300">Areas:</span>
                  <span className="text-amber-100">{device.ospf_areas}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BGP Information */}
        <div className="bg-amber-800/20 p-2 border-l-4 border-l-amber-700">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-amber-100">BGP</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              device.bgp_enabled === "true" ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"
            }`}>
              {device.bgp_enabled === "true" ? "ENABLED" : "DISABLED"}
            </span>
          </div>
          
          {device.bgp_enabled === "true" && (
            <div className="space-y-1 text-xs">
              {device.bgp_as && (
                <div className="flex justify-between">
                  <span className="text-amber-300">AS Number:</span>
                  <span className="text-amber-100">{device.bgp_as}</span>
                </div>
              )}
              {device.bgp_neighbors && (
                <div className="flex justify-between">
                  <span className="text-amber-300">Neighbors:</span>
                  <span className="text-amber-100">{device.bgp_neighbors}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Routing Table */}
        <div className="bg-amber-800/20 p-2 border-l-4 border-l-amber-700">
          <div className="font-semibold text-amber-100 mb-2">Routing Table</div>
          <div className="space-y-1 text-xs">
            {device.routing_table_count && (
              <div className="flex justify-between">
                <span className="text-amber-300">Total Routes:</span>
                <span className="text-amber-100">{device.routing_table_count}</span>
              </div>
            )}
            {device.default_gateway && (
              <div className="flex justify-between">
                <span className="text-amber-300">Default Gateway:</span>
                <span className="text-amber-100 font-mono">{device.default_gateway}</span>
              </div>
            )}
            {staticRoutesCount > 0 && (
              <div className="flex justify-between">
                <span className="text-amber-300">Static Routes:</span>
                <span className="text-amber-100">{staticRoutesCount}</span>
              </div>
            )}
          </div>
          {device.routing_table_count && (
            <button
              onClick={() => setShowRoutingTableModal(true)}
              className="w-full mt-3 p-2 bg-amber-700/80 hover:bg-amber-600/80 text-amber-100 rounded-md text-xs font-medium transition-colors"
            >
              📋 View Full Routing Table
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);

const HighAvailabilitySection = ({ device, vrrpInterfaces }) => (
  <div>
    <div className="bg-orange-900/20 border-t-4 border-t-orange-600 p-3">
      <h3 className="font-semibold mb-1 text-orange-100 flex items-center gap-2">
        🔄 High Availability
      </h3>
      <div className="space-y-1 text-sm">
        {device.vrrp_status && (
          <div className="bg-orange-800/20 p-2 border-l-4 border-l-orange-700">
            <div className="flex justify-between items-center mb-1">
              <span className="text-orange-300">VRRP Status:</span>
              <span className={`text-xs px-2 py-1 rounded font-semibold ${
                device.vrrp_status === "active" ? "bg-green-800 text-green-200" : 
                device.vrrp_status === "standby" ? "bg-blue-800 text-blue-200" : 
                "bg-gray-800 text-gray-200"
              }`}>
                {device.vrrp_status?.toUpperCase()}
              </span>
            </div>
            {device.vrrp_group && (
              <div className="flex justify-between text-xs">
                <span className="text-orange-300">Group:</span>
                <span className="text-orange-100">{device.vrrp_group}</span>
              </div>
            )}
            {device.vrrp_priority && (
              <div className="flex justify-between text-xs">
                <span className="text-orange-300">Priority:</span>
                <span className="text-orange-100">{device.vrrp_priority}</span>
              </div>
            )}
          </div>
        )}
        
        {vrrpInterfaces.length > 0 && (
          <div className="bg-orange-800/20 p-2 border-l-4 border-l-orange-700">
            <div className="text-orange-100 font-semibold mb-1">VRRP Interfaces</div>
            <div className="space-y-2">
              {vrrpInterfaces.map((vrrpIface, index) => (
                <div key={index} className="bg-orange-700/30 p-2 rounded text-xs">
                  <div className="flex justify-between">
                    <span className="text-orange-200 font-mono">{vrrpIface.interface}</span>
                    <span className="text-orange-100">Group {vrrpIface.vrrp_group}</span>
                  </div>
                  {vrrpIface.virtual_ip && (
                    <div className="text-orange-300 font-mono">{vrrpIface.virtual_ip}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const RouterLayer3Interfaces = ({ routerLayer3Interfaces }) => {
  const [expandedInterfaces, setExpandedInterfaces] = React.useState({});
  
  const toggleInterface = (ifaceName) => {
    setExpandedInterfaces(prev => ({
      ...prev,
      [ifaceName]: !prev[ifaceName]
    }));
  };
  
  return (
    <div>
      <div className="bg-indigo-900/20 border-t-4 border-t-indigo-600 p-3">
        <h3 className="font-semibold mb-1 text-indigo-100 flex items-center gap-2">
          🔗 Layer 3 Interfaces
          <span className="text-xs bg-indigo-800/60 px-2 py-1 rounded">
            {routerLayer3Interfaces.length} interfaces
          </span>
        </h3>
        
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {routerLayer3Interfaces.map((iface, index) => {
            const isExpanded = expandedInterfaces[iface.interface];
            const abbreviatedName = window.abbreviateInterfaceName(iface.interface);
            const ipDisplay = iface.config?.ip_address ? 
              `${iface.config.ip_address}/${iface.config.subnet_mask === '255.255.255.252' ? '30' : 
                iface.config.subnet_mask === '255.255.255.0' ? '24' : 
                iface.config.subnet_mask === '255.255.0.0' ? '16' : 
                iface.config.subnet_mask === '255.0.0.0' ? '8' : '24'}` : '';
            
            return (
              <div key={index} className="border-l-4 transition-all"
                   style={{borderLeftColor: iface.config?.status === "down" ? "#EF4444" : "#10B981"}}>
                <div 
                  className="bg-indigo-800/20 p-2 cursor-pointer hover:bg-indigo-800/30 transition-colors"
                  onClick={() => toggleInterface(iface.interface)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-gray-400 text-xs">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span className="font-mono text-indigo-100 text-sm font-semibold">
                        {abbreviatedName}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-indigo-700 text-indigo-200">
                        R
                      </span>
                      {ipDisplay && (
                        <span className="text-xs text-indigo-300 font-mono">
                          {ipDisplay}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs px-2 py-0.5 rounded font-medium ml-2 ${
                      iface.config?.status === "down" 
                        ? "bg-red-800 text-red-200" 
                        : "bg-green-800 text-green-200"
                    }`}>
                      {iface.config?.status?.toUpperCase() || "UP"}
                    </div>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="bg-indigo-900/10 p-2 border-t border-indigo-700/30">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {iface.config?.description && (
                        <div className="col-span-2">
                          <span className="text-indigo-400">Description:</span>
                          <span className="text-indigo-200 ml-1 italic">{iface.config.description}</span>
                        </div>
                      )}
                      {iface.config?.ospf_area && (
                        <div>
                          <span className="text-indigo-400">OSPF Area:</span>
                          <span className="text-indigo-200 ml-1">{iface.config.ospf_area}</span>
                        </div>
                      )}
                      {iface.config?.ospf_cost && (
                        <div>
                          <span className="text-indigo-400">OSPF Cost:</span>
                          <span className="text-indigo-200 ml-1">{iface.config.ospf_cost}</span>
                        </div>
                      )}
                      {iface.config?.ospf_network_type && (
                        <div className="col-span-2">
                          <span className="text-indigo-400">Network Type:</span>
                          <span className="text-indigo-200 ml-1">{iface.config.ospf_network_type}</span>
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
    </div>
  );
};

const SwitchSVISection = ({ deviceSVIs }) => {
  const [expandedSVIs, setExpandedSVIs] = React.useState({});
  
  const toggleSVI = (sviName) => {
    setExpandedSVIs(prev => ({
      ...prev,
      [sviName]: !prev[sviName]
    }));
  };
  
  return (
    <div>
      <div className="bg-indigo-900/20 border-t-4 border-t-indigo-600 p-3">
        <h3 className="font-semibold mb-1 text-indigo-100 flex items-center gap-2">
          🔗 SVI / Layer 3 Interfaces
          <span className="text-xs bg-indigo-800/60 px-2 py-1 rounded">
            {deviceSVIs.length} SVIs
          </span>
        </h3>
        
        {deviceSVIs.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {deviceSVIs.map((svi, index) => {
              const isExpanded = expandedSVIs[svi.interface];
              const abbreviatedName = window.abbreviateInterfaceName(svi.interface);
              const ipDisplay = svi.config?.ip_address ? 
                `${svi.config.ip_address}/${svi.config.subnet_mask === '255.255.255.0' ? '24' : 
                  svi.config.subnet_mask === '255.255.0.0' ? '16' : 
                  svi.config.subnet_mask === '255.0.0.0' ? '8' : 
                  svi.config.subnet_mask === '255.255.255.128' ? '25' :
                  svi.config.subnet_mask === '255.255.255.192' ? '26' :
                  svi.config.subnet_mask === '255.255.255.224' ? '27' :
                  svi.config.subnet_mask === '255.255.255.240' ? '28' :
                  svi.config.subnet_mask === '255.255.255.248' ? '29' :
                  svi.config.subnet_mask === '255.255.255.252' ? '30' : '24'}` : '';
              
              return (
                <div key={index} className="border-l-4 transition-all"
                     style={{borderLeftColor: svi.config?.status === "down" ? "#EF4444" : "#10B981"}}>
                  <div 
                    className="bg-indigo-800/20 p-2 cursor-pointer hover:bg-indigo-800/30 transition-colors"
                    onClick={() => toggleSVI(svi.interface)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-gray-400 text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <span className="font-mono text-indigo-100 text-sm font-semibold">
                          {abbreviatedName}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold bg-indigo-700 text-indigo-200">
                          L3
                        </span>
                        {ipDisplay && (
                          <span className="text-xs text-indigo-300 font-mono">
                            {ipDisplay}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded font-medium ml-2 ${
                        svi.config?.status === "down" 
                          ? "bg-red-800 text-red-200" 
                          : "bg-green-800 text-green-200"
                      }`}>
                        {svi.config?.status?.toUpperCase() || "UP"}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-indigo-900/10 p-2 border-t border-indigo-700/30">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {svi.config?.vlan_id && (
                          <div>
                            <span className="text-indigo-400">VLAN ID:</span>
                            <span className="text-indigo-200 ml-1">{svi.config.vlan_id}</span>
                          </div>
                        )}
                        {svi.config?.helper_address && (
                          <div>
                            <span className="text-indigo-400">IP Helper:</span>
                            <span className="text-indigo-200 ml-1 font-mono">{svi.config.helper_address}</span>
                          </div>
                        )}
                        {svi.config?.ospf_area && (
                          <div>
                            <span className="text-indigo-400">OSPF Area:</span>
                            <span className="text-indigo-200 ml-1">{svi.config.ospf_area}</span>
                          </div>
                        )}
                        {svi.config?.ospf_cost && (
                          <div>
                            <span className="text-indigo-400">OSPF Cost:</span>
                            <span className="text-indigo-200 ml-1">{svi.config.ospf_cost}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-indigo-300/60">
            <div className="text-3xl mb-2">🔗</div>
            <div className="text-sm">No SVIs configured</div>
            <div className="text-xs mt-1">
              Add SVI configurations to your D2 files
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FirewallSecurityZones = () => (
  <div>
    <div className="bg-red-900/20 border-t-4 border-t-red-600 p-3">
      <h3 className="font-semibold mb-1 text-red-100 flex items-center gap-2">
        🛡️ Security Zones
      </h3>
      <div className="space-y-1 text-sm">
        <div className="bg-red-800/20 p-2 border-l-4 border-l-red-700">
          <div className="font-semibold text-red-100">Trust Zone</div>
          <div className="text-red-300 text-xs">Internal network access</div>
        </div>
        <div className="bg-red-800/20 p-2 border-l-4 border-l-red-700">
          <div className="font-semibold text-red-100">Untrust Zone</div>
          <div className="text-red-300 text-xs">External/Internet access</div>
        </div>
      </div>
    </div>
  </div>
);

// Device-specific feature components

const RouterSpecificFeatures = ({ device, deviceInterfaces }) => (
  <div>
    <div className="bg-orange-900/20 border-t-4 border-t-orange-600 p-3">
      <h3 className="font-semibold mb-1 text-orange-100 flex items-center gap-2">
        🌐 Router Status
      </h3>
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-orange-300">Configured Interfaces:</span>
          <span className="text-orange-100">{deviceInterfaces.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-orange-300">Active Interfaces:</span>
          <span className="text-green-300">{deviceInterfaces.filter(i => i.config.status === "up").length}</span>
        </div>
        {device.firmware_version && (
          <div className="flex justify-between">
            <span className="text-orange-300">Firmware:</span>
            <span className="text-orange-100 font-mono text-xs">{device.firmware_version}</span>
          </div>
        )}
        {device.cpu_usage && (
          <div className="flex justify-between">
            <span className="text-orange-300">CPU Usage:</span>
            <span className="text-orange-100">{device.cpu_usage}</span>
          </div>
        )}
        {device.memory_usage && (
          <div className="flex justify-between">
            <span className="text-orange-300">Memory Usage:</span>
            <span className="text-orange-100">{device.memory_usage}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const SwitchSpecificFeatures = ({ device, deviceInterfaces }) => (
  <div>
    <div className="bg-purple-900/20 border-t-4 border-t-purple-600 p-3">
      <h3 className="font-semibold mb-1 text-purple-100 flex items-center gap-2">
        🔧 Switch Features
      </h3>
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-purple-300">Total Ports:</span>
          <span className="text-purple-100">{deviceInterfaces.length}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-purple-300">Active Ports:</span>
          <span className="text-green-300">{deviceInterfaces.filter(i => i.config.status === "up").length}</span>
        </div>
        {device.vsx_role && (
          <div className="flex justify-between">
            <span className="text-purple-300">VSX Role:</span>
            <span className="text-purple-100">{device.vsx_role}</span>
          </div>
        )}
        {device.vsx_status && (
          <div className="flex justify-between">
            <span className="text-purple-300">VSX Status:</span>
            <span className="text-purple-100">{device.vsx_status}</span>
          </div>
        )}
        {device.poe_usage && (
          <div className="flex justify-between">
            <span className="text-purple-300">PoE Usage:</span>
            <span className="text-purple-100">{device.poe_usage}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const FirewallSpecificFeatures = ({ device }) => (
  <div>
    <div className="bg-red-900/20 border-t-4 border-t-red-600 p-3">
      <h3 className="font-semibold mb-1 text-red-100 flex items-center gap-2">
        🛡️ Firewall Status
      </h3>
      <div className="text-sm space-y-1">
        {device.ha_status && (
          <div className="flex justify-between">
            <span className="text-red-300">HA Status:</span>
            <span className="text-red-100">{device.ha_status}</span>
          </div>
        )}
        {device.sessions_active && (
          <div className="flex justify-between">
            <span className="text-red-300">Active Sessions:</span>
            <span className="text-red-100">{parseInt(device.sessions_active).toLocaleString()}</span>
          </div>
        )}
        {device.firmware_version && (
          <div className="flex justify-between">
            <span className="text-red-300">Firmware:</span>
            <span className="text-red-100 font-mono text-xs">{device.firmware_version}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);

const WirelessControllerFeatures = ({ device }) => (
  <div>
    <div className="bg-emerald-900/20 border-t-4 border-t-emerald-600 p-3">
      <h3 className="font-semibold mb-1 text-emerald-100 flex items-center gap-2">
        📶 Wireless Controller
      </h3>
      <div className="text-sm space-y-1">
        {device.controller_status && (
          <div className="flex justify-between">
            <span className="text-emerald-300">Controller Status:</span>
            <span className={`text-xs px-2 py-1 rounded font-medium ${
              device.controller_status === "active" ? "bg-green-800 text-green-200" : "bg-gray-800 text-gray-200"
            }`}>
              {device.controller_status?.toUpperCase()}
            </span>
          </div>
        )}
        {device.aps_connected && (
          <div className="flex justify-between">
            <span className="text-emerald-300">APs Connected:</span>
            <span className="text-emerald-100">{device.aps_connected}</span>
          </div>
        )}
        {device.total_clients && (
          <div className="flex justify-between">
            <span className="text-emerald-300">Total Clients:</span>
            <span className="text-emerald-100">{device.total_clients}</span>
          </div>
        )}
        {device.licenses_used && (
          <div className="flex justify-between">
            <span className="text-emerald-300">Licenses Used:</span>
            <span className="text-emerald-100">
              {device.licenses_used}
              {device.licenses_available && `/${device.licenses_available}`}
            </span>
          </div>
        )}
        {device.firmware_version && (
          <div className="flex justify-between">
            <span className="text-emerald-300">Firmware:</span>
            <span className="text-emerald-100 font-mono text-xs">{device.firmware_version}</span>
          </div>
        )}
        {device.mgmt_vlan && (
          <div className="flex justify-between">
            <span className="text-emerald-300">Management VLAN:</span>
            <span className="text-emerald-100">{device.mgmt_vlan}</span>
          </div>
        )}
        {device.guest_portal && (
          <div className="flex justify-between">
            <span className="text-emerald-300">Guest Portal:</span>
            <span className="text-emerald-100">{device.guest_portal}</span>
          </div>
        )}
      </div>
    </div>
  </div>
);