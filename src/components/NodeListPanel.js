// NodeListPanel component for displaying all network devices when nothing is selected
// Simple list of clickable device names

window.NodeListPanel = ({ 
  networkData, 
  selectedTopology, 
  setSelectedDevice, 
  setSelectedConnection 
}) => {
  // Get current topology and parse devices
  const getCurrentTopology = () => {
    return networkData?.sites[selectedTopology];
  };

  const getDeviceList = () => {
    const topology = getCurrentTopology();
    if (!topology?.d2) return [];

    // Parse the topology to get device list
    const graphData = window.parseD2ToGraph(topology.d2);
    return graphData.nodes || [];
  };

  const devices = getDeviceList();

  // Group devices by role for better organization
  const getDeviceRole = (device) => {
    return device.device?.role || 'unknown';
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      'core_switch': 'Core Switches',
      'access_switch': 'Access Switches', 
      'router': 'Routers',
      'firewall': 'Firewalls',
      'wireless_controller': 'Wireless Controllers',
      'isp_pe': 'ISP Provider Edge',
      'unknown': 'Other Devices'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role) => {
    const roleColors = {
      'core_switch': 'text-red-400',
      'access_switch': 'text-blue-400',
      'router': 'text-green-400',
      'firewall': 'text-orange-400',
      'wireless_controller': 'text-purple-400',
      'isp_pe': 'text-yellow-400',
      'unknown': 'text-gray-400'
    };
    return roleColors[role] || 'text-gray-400';
  };

  // Group devices by role
  const devicesByRole = devices.reduce((groups, device) => {
    const role = getDeviceRole(device);
    if (!groups[role]) {
      groups[role] = [];
    }
    groups[role].push(device);
    return groups;
  }, {});

  // Sort devices within each role group
  Object.keys(devicesByRole).forEach(role => {
    devicesByRole[role].sort((a, b) => {
      return (a.label || a.id).localeCompare(b.label || b.id);
    });
  });

  // Sort role groups by priority
  const rolePriority = ['core_switch', 'access_switch', 'router', 'firewall', 'wireless_controller', 'isp_pe', 'unknown'];
  const sortedRoles = Object.keys(devicesByRole).sort((a, b) => {
    const priorityA = rolePriority.indexOf(a);
    const priorityB = rolePriority.indexOf(b);
    return (priorityA === -1 ? 999 : priorityA) - (priorityB === -1 ? 999 : priorityB);
  });

  // Handle device click
  const handleDeviceClick = (device) => {
    setSelectedDevice(device);
    setSelectedConnection(null);
  };

  if (devices.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <p className="text-base">No devices found</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold text-gray-100 mb-2">Devices</h3>
      
      <div>
        {sortedRoles.map((role) => (
          <div key={role} className="mb-3">
            <h4 className={`text-sm font-medium mb-1 ${getRoleColor(role)}`}>
              {getRoleDisplayName(role)} ({devicesByRole[role].length})
            </h4>
            <div className="ml-2">
              {devicesByRole[role].map((device) => (
                <div
                  key={device.id}
                  onClick={() => handleDeviceClick(device)}
                  className="px-2 py-0.5 text-gray-100 hover:bg-gray-700 rounded cursor-pointer transition-colors"
                >
                  {device.label || device.id}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};