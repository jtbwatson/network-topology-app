// Modal components for the network topology app

window.AccessPointsModal = ({ showAPModal, setShowAPModal, getCurrentTopology }) => {
  if (!showAPModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-100">
          Estimated Access Points
        </h3>

        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-4">📡</div>
          <div className="text-lg mb-2">
            Estimated {getCurrentTopology()?.site_info?.aps_count || 0} Access Points
          </div>
          <div className="text-sm text-gray-500 mb-4">
            Based on {getCurrentTopology()?.site_info?.device_types?.filter(t => t === 'wireless_controller').length || 0} wireless controllers detected
          </div>
          <div className="text-xs text-gray-500">
            To see detailed AP information, add access point definitions to your D2 files
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowAPModal(false)}
            className="flex-1 p-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

window.RoutingTableModal = ({ 
  showRoutingTableModal, 
  setShowRoutingTableModal, 
  selectedDevice, 
  interfacesData 
}) => {
  if (!showRoutingTableModal || !selectedDevice) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 text-gray-100 flex items-center gap-2">
          📋 Routing Table - {selectedDevice.label}
        </h3>

        <div className="space-y-4">
          {/* Default Gateway */}
          {selectedDevice.device?.default_gateway && (
            <DefaultRouteSection defaultGateway={selectedDevice.device.default_gateway} />
          )}

          {/* Static Routes */}
          {selectedDevice.device?.static_routes && (
            <StaticRoutesSection staticRoutes={selectedDevice.device.static_routes} />
          )}

          {/* Connected Routes */}
          <ConnectedRoutesSection 
            selectedDevice={selectedDevice}
            interfacesData={interfacesData}
          />

          {/* OSPF Routes */}
          {selectedDevice.device?.ospf_enabled === "true" && (
            <OSPFRoutesSection device={selectedDevice.device} />
          )}

          {/* BGP Routes */}
          {selectedDevice.device?.bgp_enabled === "true" && (
            <BGPRoutesSection device={selectedDevice.device} />
          )}

          {/* Route Summary */}
          <RouteSummarySection 
            device={selectedDevice.device}
            staticRoutesCount={window.getStaticRoutesCount(selectedDevice.device?.static_routes)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={() => setShowRoutingTableModal(false)}
            className="flex-1 p-3 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const DefaultRouteSection = ({ defaultGateway }) => (
  <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
    <h4 className="text-sm font-semibold text-gray-200 mb-2">Default Route</h4>
    <div className="font-mono text-sm text-green-300">
      0.0.0.0/0 → {defaultGateway}
    </div>
  </div>
);

const StaticRoutesSection = ({ staticRoutes }) => (
  <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
    <h4 className="text-sm font-semibold text-gray-200 mb-2">Static Routes</h4>
    <div className="space-y-1">
      {staticRoutes.split(',').map((route, index) => (
        <div key={index} className="font-mono text-sm text-blue-300">
          {route.trim()}
        </div>
      ))}
    </div>
  </div>
);

const ConnectedRoutesSection = ({ selectedDevice, interfacesData }) => {
  const routerLayer3Interfaces = window.getRouterLayer3Interfaces(selectedDevice.id, interfacesData);
  const deviceSVIs = window.getDeviceSVIs(selectedDevice.id, selectedDevice.device);

  return (
    <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
      <h4 className="text-sm font-semibold text-gray-200 mb-2">Connected Routes</h4>
      <div className="space-y-1">
        {routerLayer3Interfaces.map((iface, index) => (
          <div key={index} className="font-mono text-sm text-purple-300">
            {iface.config.ip_address && iface.config.subnet_mask && (
              `${iface.config.ip_address}/${iface.config.subnet_mask === '255.255.255.252' ? '30' : 
                iface.config.subnet_mask === '255.255.255.0' ? '24' : 
                iface.config.subnet_mask === '255.255.0.0' ? '16' : '24'} via ${iface.interface}`
            )}
          </div>
        ))}
        {deviceSVIs.map((svi, index) => (
          <div key={index} className="font-mono text-sm text-purple-300">
            {svi.config.ip_address && svi.config.subnet_mask && (
              `${svi.config.ip_address}/${svi.config.subnet_mask === '255.255.255.0' ? '24' : 
                svi.config.subnet_mask === '255.255.0.0' ? '16' : '24'} via ${svi.interface}`
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const OSPFRoutesSection = ({ device }) => (
  <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
    <h4 className="text-sm font-semibold text-gray-200 mb-2">OSPF Routes</h4>
    <div className="text-sm text-amber-300">
      OSPF is enabled - Dynamic routes will be populated by OSPF protocol
    </div>
    <div className="text-xs text-gray-400 mt-1">
      Areas: {device.ospf_areas} | Process ID: {device.ospf_process_id}
    </div>
  </div>
);

const BGPRoutesSection = ({ device }) => (
  <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
    <h4 className="text-sm font-semibold text-gray-200 mb-2">BGP Routes</h4>
    <div className="text-sm text-orange-300">
      BGP is enabled - External routes will be populated by BGP protocol
    </div>
    <div className="text-xs text-gray-400 mt-1">
      AS: {device.bgp_as} | Neighbors: {device.bgp_neighbors || 0}
    </div>
  </div>
);

const RouteSummarySection = ({ device, staticRoutesCount }) => (
  <div className="bg-blue-900/20 border border-blue-600/50 p-4 rounded-lg">
    <h4 className="text-sm font-semibold text-blue-200 mb-3">Route Summary</h4>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="flex justify-between">
        <span className="text-blue-300">Total Routes:</span>
        <span className="text-blue-100">{device?.routing_table_count || 0}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-blue-300">Static Routes:</span>
        <span className="text-blue-100">{staticRoutesCount}</span>
      </div>
    </div>
  </div>
);