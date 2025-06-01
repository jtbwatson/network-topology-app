// Custom hook for vis-network visualization management
// Network topology visualization using vis.js - much more reliable than NetJSONGraph

window.useVisNetworkVisualization = ({
  containerRef,
  networkData,
  selectedTopology,
  setInterfacesData,
  setSelectedDevice,
  setSelectedConnection,
  setShowAPModal,
  setShowRoutingTableModal
}) => {
  const { useEffect, useRef } = React;
  const visNetworkRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !networkData) return;

    // Clean up existing instance
    if (visNetworkRef.current) {
      visNetworkRef.current.destroy();
      visNetworkRef.current = null;
    }

    const topology = networkData?.sites[selectedTopology];
    if (!topology) return;

    const graphData = window.parseD2ToGraph(topology.d2);

    // Store interfaces data for connection details
    setInterfacesData(graphData.interfaces || new Map());

    // Convert to vis.js format
    const visData = window.convertToVisNetwork(graphData);

    // Create the visualization
    try {
      console.log('Checking vis.Network availability:', typeof window.vis);
      
      // Check if vis.js is available
      if (typeof window.vis === 'undefined') {
        throw new Error('vis.js is not available. Library may not have loaded correctly.');
      }

      const options = {
        nodes: {
          shape: 'dot',
          size: 30,
          font: {
            color: '#E5E7EB',
            size: 12,
            face: 'Arial',
            strokeWidth: 2,
            strokeColor: '#000000'
          },
          borderWidth: 3,
          shadow: {
            enabled: true,
            color: 'rgba(0,0,0,0.5)',
            size: 8,
            x: 3,
            y: 3
          }
        },
        edges: {
          color: {
            color: '#6B7280',
            highlight: '#EF4444',
            hover: '#9CA3AF'
          },
          width: 3,
          // Don't set global smooth - let individual edges control their own smoothing
          arrows: {
            to: {
              enabled: false
            }
          }
        },
        physics: {
          enabled: true,
          stabilization: {
            enabled: true,
            iterations: 200,
            updateInterval: 25,
            onlyDynamicEdges: false,
            fit: true
          },
          barnesHut: {
            gravitationalConstant: -8000,
            centralGravity: 0.3,
            springLength: 200,
            springConstant: 0.05,
            damping: 0.4,
            avoidOverlap: 0.1
          },
          solver: 'barnesHut'
        },
        interaction: {
          hover: true,
          selectConnectedEdges: false,
          tooltipDelay: 300
        },
        layout: {
          improvedLayout: true,
          hierarchical: {
            enabled: false
          }
        }
      };

      const network = new window.vis.Network(containerRef.current, visData, options);
      visNetworkRef.current = network;

      // Event handlers
      network.on('click', function(params) {
        if (params.nodes.length > 0) {
          // Node clicked
          const nodeId = params.nodes[0];
          const deviceData = graphData.nodes.find(n => n.id === nodeId);
          
          if (deviceData) {
            setSelectedDevice(deviceData);
            setSelectedConnection(null);
            setShowAPModal(false);
            setShowRoutingTableModal(false);
          }
        } else if (params.edges.length > 0) {
          // Edge clicked
          const edgeId = params.edges[0];
          const edge = visData.edges.get(edgeId);
          
          if (edge) {
            const sourceDevice = graphData.nodes.find(n => n.id === edge.from);
            const targetDevice = graphData.nodes.find(n => n.id === edge.to);
            
            if (sourceDevice && targetDevice) {
              const originalLink = graphData.links.find(l => 
                (l.source === edge.from && l.target === edge.to) ||
                (l.source === edge.to && l.target === edge.from)
              );
              
              const connectionData = {
                id: `${edge.from}-${edge.to}`,
                source: sourceDevice,
                target: targetDevice,
                sourceInterface: originalLink?.sourceInterface || "unknown",
                targetInterface: originalLink?.targetInterface || "unknown",
                sourceInterfaceKey: originalLink?.sourceInterfaceKey || "",
                targetInterfaceKey: originalLink?.targetInterfaceKey || ""
              };

              setSelectedConnection(connectionData);
              setSelectedDevice(null);
              setShowAPModal(false);
              setShowRoutingTableModal(false);
            }
          }
        } else {
          // Background clicked
          setSelectedDevice(null);
          setSelectedConnection(null);
          setShowAPModal(false);
          setShowRoutingTableModal(false);
        }
      });

      network.on('stabilizationIterationsDone', function() {
        console.log('vis.js network stabilized');
        network.setOptions({ physics: { enabled: false } });
      });

      console.log('vis.Network instance created');
      
    } catch (error) {
      console.error('Error creating vis.Network:', error);
      // Fallback to basic rendering if vis.js fails
      containerRef.current.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #EF4444;">
          <div style="text-align: center;">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
            <div>vis.js Network failed to load</div>
            <div style="font-size: 0.8rem; margin-top: 0.5rem; color: #9CA3AF;">
              ${error.message}
            </div>
          </div>
        </div>
      `;
    }

    return () => {
      if (visNetworkRef.current) {
        visNetworkRef.current.destroy();
        visNetworkRef.current = null;
      }
    };
  }, [selectedTopology, networkData, setInterfacesData, setSelectedDevice, setSelectedConnection, setShowAPModal, setShowRoutingTableModal]);

  return { visNetworkRef };
};

// Convert D2 graph data to vis.js format
window.convertToVisNetwork = (graphData) => {
  const nodes = new window.vis.DataSet([]);
  const edges = new window.vis.DataSet([]);

  // Convert nodes
  graphData.nodes.forEach(node => {
    const deviceIcon = window.getDeviceIcon(node.type);
    const deviceColor = window.getDeviceColor(node.type);
    
    nodes.add({
      id: node.id,
      label: `${deviceIcon}\n${node.label || node.id}`,
      color: {
        background: deviceColor,
        border: deviceColor === '#DC2626' ? '#B91C1C' : 
                deviceColor === '#2563EB' ? '#1D4ED8' :
                deviceColor === '#059669' ? '#047857' :
                deviceColor === '#7C3AED' ? '#6D28D9' : '#374151',
        highlight: {
          background: deviceColor,
          border: '#EF4444'
        }
      },
      size: node.type === 'router' || node.type === 'wireless_controller' ? 50 : 
            node.type === 'switch' || node.type === 'firewall' ? 45 : 40,
      font: {
        size: node.type === 'router' || node.type === 'wireless_controller' ? 16 : 14,
        color: '#FFFFFF',
        face: 'Arial',
        strokeWidth: 2,
        strokeColor: '#000000',
        multi: 'html'
      },
      title: `${node.label || node.id}\nType: ${node.type}\nIP: ${node.mgmt_ip || 'N/A'}`,
      deviceType: node.type,
      deviceData: node
    });
  });

  // Process links to handle multiple connections between same nodes
  const processedLinks = window.processLinksForVisNetwork(graphData.links);
  
  // Convert links
  processedLinks.forEach((link, index) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    edges.add({
      id: `edge-${index}`,
      from: sourceId,
      to: targetId,
      title: `${sourceId} -> ${targetId}\nSource: ${link.sourceInterface || 'unknown'}\nTarget: ${link.targetInterface || 'unknown'}`,
      sourceInterface: link.sourceInterface || "unknown",
      targetInterface: link.targetInterface || "unknown",
      smooth: link.smooth
    });
  });

  console.log('Converted to vis.js format:', { nodes: nodes.length, edges: edges.length });
  return { nodes, edges };
};

// Process links for multiple connections between same devices
window.processLinksForVisNetwork = (links) => {
  // Group links by device pairs to handle multiple connections
  const linkGroups = new Map();
  
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    
    // Create a consistent key regardless of direction
    const key1 = `${sourceId}-${targetId}`;
    const key2 = `${targetId}-${sourceId}`;
    const key = linkGroups.has(key1) ? key1 : (linkGroups.has(key2) ? key2 : key1);
    
    if (!linkGroups.has(key)) {
      linkGroups.set(key, []);
    }
    linkGroups.get(key).push(link);
  });

  // Process links with minimal curves for multiple connections
  const processedLinks = [];
  
  linkGroups.forEach(linkGroup => {
    if (linkGroup.length === 1) {
      // Single connection - perfectly straight
      processedLinks.push({
        ...linkGroup[0],
        smooth: false
      });
    } else {
      // Multiple connections - use VERY minimal curves just for clickability
      linkGroup.forEach((link, index) => {
        let smooth;
        if (index === 0) {
          // First connection stays straight
          smooth = false;
        } else {
          // Subsequent connections get small but visible curves
          // Enough to clearly see separate lines
          const roundness = 0.08 + (index - 1) * 0.03; // Start at 0.08, increase for more connections
          smooth = {
            type: index % 2 === 1 ? 'curvedCW' : 'curvedCCW',
            roundness: Math.min(roundness, 0.2) // Cap at reasonable curve
          };
        }
        
        processedLinks.push({
          ...link,
          smooth: smooth
        });
      });
    }
  });

  console.log(`Processed ${links.length} links - single connections straight, multiple with minimal curves`);
  return processedLinks;
};

// vis.js layout utilities
window.resetVisLayout = (visNetworkRef) => {
  if (visNetworkRef.current) {
    try {
      // First, disable hierarchical layout completely
      visNetworkRef.current.setOptions({
        layout: {
          hierarchical: {
            enabled: false
          }
        },
        physics: { 
          enabled: true,
          barnesHut: {
            gravitationalConstant: -8000,
            centralGravity: 0.3,
            springLength: 200,
            springConstant: 0.05,
            damping: 0.4,
            avoidOverlap: 0.1
          },
          solver: 'barnesHut'
        }
      });
      
      // Force all nodes to be moveable in all directions
      const allNodes = visNetworkRef.current.body.data.nodes.get();
      const updatedNodes = allNodes.map(node => ({
        ...node,
        fixed: { x: false, y: false },
        physics: true
      }));
      visNetworkRef.current.body.data.nodes.update(updatedNodes);
      
      // IMPORTANT: Preserve the curved edges for multiple connections
      // Re-apply the edge smooth settings that may have been overridden
      const allEdges = visNetworkRef.current.body.data.edges.get();
      visNetworkRef.current.body.data.edges.update(allEdges); // This refreshes the edge rendering
      
      // Restart the simulation
      visNetworkRef.current.stabilize();
      console.log('Layout reset - nodes can now move freely, curved edges preserved');
    } catch (e) {
      console.log('Reset layout error:', e);
    }
  }
};

window.autoArrangeVisLayout = (visNetworkRef) => {
  if (visNetworkRef.current) {
    try {
      // Enable hierarchical layout
      visNetworkRef.current.setOptions({
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'UD',
            sortMethod: 'directed',
            nodeSpacing: 200,
            levelSeparation: 150,
            shakeTowards: 'roots'
          }
        },
        physics: { 
          enabled: true,
          hierarchicalRepulsion: {
            centralGravity: 0.0,
            springLength: 100,
            springConstant: 0.01,
            nodeDistance: 120,
            damping: 0.09
          },
          solver: 'hierarchicalRepulsion'
        }
      });
      
      console.log('Hierarchical layout applied - use Reset Layout to return to free movement');
    } catch (e) {
      console.log('Auto arrange error:', e);
    }
  }
};

window.enableVisGridSnap = (visNetworkRef, gridSize = 50) => {
  if (visNetworkRef.current) {
    // vis.js doesn't have built-in grid snap, but we can implement it
    visNetworkRef.current.on('dragEnd', function(params) {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const position = visNetworkRef.current.getPosition(nodeId);
        
        // Snap to grid
        const snappedX = Math.round(position.x / gridSize) * gridSize;
        const snappedY = Math.round(position.y / gridSize) * gridSize;
        
        visNetworkRef.current.moveNode(nodeId, snappedX, snappedY);
      }
    });
    console.log(`Grid snap enabled with ${gridSize}px grid`);
  }
};