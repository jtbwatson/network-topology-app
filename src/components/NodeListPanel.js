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

  // Sort devices alphabetically by name
  const sortedDevices = [...devices].sort((a, b) => {
    return (a.label || a.id).localeCompare(b.label || b.id);
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
      <h3 className="text-lg font-semibold text-gray-100 mb-4">Devices</h3>
      
      <div className="space-y-1">
        {sortedDevices.map((device) => (
          <div
            key={device.id}
            onClick={() => handleDeviceClick(device)}
            className="px-3 py-2 text-gray-100 hover:bg-gray-700 rounded cursor-pointer transition-colors"
          >
            {device.label || device.id}
          </div>
        ))}
      </div>
    </div>
  );
};