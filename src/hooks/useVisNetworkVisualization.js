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
            highlight: '#10B981',
            hover: '#9CA3AF'
          },
          width: 3,
          chosen: {
            edge: function(values, id, selected, hovering) {
              if (selected) {
                values.color = '#10B981';
                values.width = 5;
                values.shadow = true;
                values.shadowColor = '#10B981';
                values.shadowSize = 8;
                values.shadowX = 0;
                values.shadowY = 0;
              }
            }
          },
          shadow: {
            enabled: false
          },
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
        // Clear any existing interface labels
        window.clearInterfaceLabels(containerRef.current);
        
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
              // Use the interface data directly from the edge - this ensures we get the right connection
              const connectionData = {
                id: `${edge.from}-${edge.to}-${edge.sourceInterface}-${edge.targetInterface}`,
                source: sourceDevice,
                target: targetDevice,
                sourceInterface: edge.sourceInterface || "unknown",
                targetInterface: edge.targetInterface || "unknown",
                sourceInterfaceKey: `${edge.from}.${edge.sourceInterface}`,
                targetInterfaceKey: `${edge.to}.${edge.targetInterface}`
              };

              // Show interface labels for selected connection
              window.showInterfaceLabels(network, edge, connectionData, containerRef.current);

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

      // Custom drawing for port channel indicators
      network.on('afterDrawing', function(ctx) {
        // Get current network state
        const edges = network.body.data.edges;
        const positions = network.getPositions();
        const selectedEdges = network.getSelectedEdges();
        
        // Draw ellipse indicators for port channels
        edges.forEach(edge => {
          if (edge.isPortChannel) {
            const fromPos = positions[edge.from];
            const toPos = positions[edge.to];
            
            if (fromPos && toPos) {
              // Calculate midpoint
              const midX = (fromPos.x + toPos.x) / 2;
              const midY = (fromPos.y + toPos.y) / 2;
              
              // Check if this edge is selected
              const isSelected = selectedEdges.includes(edge.id);
              
              // Draw ellipse/circle indicator
              ctx.save();
              if (isSelected) {
                ctx.strokeStyle = '#10B981'; // Green when selected
                ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Semi-transparent green fill
              } else {
                ctx.strokeStyle = '#6B7280'; // Gray when not selected
                ctx.fillStyle = 'rgba(107, 114, 128, 0.2)'; // Semi-transparent gray fill
              }
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.ellipse(midX, midY, 12, 8, 0, 0, 2 * Math.PI);
              ctx.fill();
              ctx.stroke();
              ctx.restore();
            }
          }
        });
      });

      // Note: Enhanced selection effects disabled for now to ensure stability
      // The built-in vis.js selection highlighting with green colors should work fine

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
      label: node.label || node.id,
      image: deviceIcon,
      shape: 'circularImage',
      color: {
        background: deviceColor,
        border: deviceColor === '#DC2626' ? '#B91C1C' : 
                deviceColor === '#2563EB' ? '#1D4ED8' :
                deviceColor === '#059669' ? '#047857' :
                deviceColor === '#7C3AED' ? '#6D28D9' :
                deviceColor === '#EAB308' ? '#CA8A04' : '#374151',
        highlight: {
          background: deviceColor,
          border: '#10B981'
        }
      },
      shadow: {
        enabled: false
      },
      chosen: {
        node: function(values, id, selected, hovering) {
          if (selected) {
            values.shadow = true;
            values.shadowColor = '#10B981';
            values.shadowSize = 20;
            values.shadowX = 0;
            values.shadowY = 0;
            values.borderWidth = 4;
            values.borderColor = '#10B981';
          }
        }
      },
      shapeProperties: {
        borderDashes: false,
        borderRadius: 15,
        interpolation: true,
        useImageSize: false,
        useBorderWithImage: true,
        imagePadding: 10
      },
      size: 50,
      font: {
        size: 14,
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
    
    // Store interface info but don't show labels by default
    const sourceInterface = link.sourceInterface || 'unknown';
    const targetInterface = link.targetInterface || 'unknown';
    
    // Detect if this is a port channel connection
    const isPortChannel = sourceInterface.toLowerCase().includes('port-channel') || 
                         targetInterface.toLowerCase().includes('port-channel');
    
    const edgeStyle = isPortChannel ? {
      width: 4,
      color: {
        color: '#6B7280', // Same gray as other links
        highlight: '#10B981', // Green when selected/highlighted
        hover: '#9CA3AF'
      },
      dashes: false,
      smooth: link.smooth
    } : {
      width: 2,
      color: {
        color: '#6B7280',
        highlight: '#9CA3AF',
        hover: '#9CA3AF'
      },
      smooth: link.smooth
    };

    edges.add({
      id: `edge-${index}`,
      from: sourceId,
      to: targetId,
      title: `${sourceId} -> ${targetId}\nSource: ${sourceInterface}\nTarget: ${targetInterface}${isPortChannel ? '\n🔗 Port Channel' : ''}`,
      sourceInterface: sourceInterface,
      targetInterface: targetInterface,
      isPortChannel: isPortChannel,
      ...edgeStyle
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
      // Get all nodes and their device types
      const allNodes = visNetworkRef.current.body.data.nodes.get();
      const positions = {};
      
      // Categorize nodes by device type
      const routers = allNodes.filter(node => node.deviceType === 'router');
      const switches = allNodes.filter(node => node.deviceType === 'switch');
      const wanProviders = allNodes.filter(node => node.deviceType === 'wan' || node.deviceType === 'wan_provider');
      const wlcs = allNodes.filter(node => node.deviceType === 'wireless_controller');
      const firewalls = allNodes.filter(node => node.deviceType === 'firewall');
      const others = allNodes.filter(node => 
        !['router', 'switch', 'wan', 'wan_provider', 'wireless_controller', 'firewall'].includes(node.deviceType)
      );
      
      // Define layout parameters
      const centerX = 0;
      const spacing = 300;
      const levelSpacing = 200;
      
      // Arrange WAN providers at the top
      wanProviders.forEach((node, i) => {
        const offset = (i - (wanProviders.length - 1) / 2) * spacing;
        positions[node.id] = { x: centerX + offset, y: -levelSpacing * 2 };
      });
      
      // Arrange routers in the upper tier
      routers.forEach((node, i) => {
        const offset = (i - (routers.length - 1) / 2) * spacing;
        positions[node.id] = { x: centerX + offset, y: -levelSpacing };
      });
      
      // Arrange firewalls (if any) between routers and switches
      firewalls.forEach((node, i) => {
        const offset = (i - (firewalls.length - 1) / 2) * spacing;
        positions[node.id] = { x: centerX + offset, y: -levelSpacing * 0.5 };
      });
      
      // Arrange core/distribution switches in the middle tier
      const coreDist = switches.filter(node => 
        node.label.includes('bigb1') || node.label.includes('bigb2') || 
        node.label.includes('core') || node.label.includes('dist')
      );
      const accessSwitches = switches.filter(node => 
        !coreDist.includes(node)
      );
      
      // Core/distribution switches
      coreDist.forEach((node, i) => {
        const offset = (i - (coreDist.length - 1) / 2) * spacing;
        positions[node.id] = { x: centerX + offset, y: 0 };
      });
      
      // Access switches in lower tier
      accessSwitches.forEach((node, i) => {
        const offset = (i - (accessSwitches.length - 1) / 2) * spacing;
        positions[node.id] = { x: centerX + offset, y: levelSpacing };
      });
      
      // Arrange wireless controllers at the bottom
      wlcs.forEach((node, i) => {
        const offset = (i - (wlcs.length - 1) / 2) * spacing;
        positions[node.id] = { x: centerX + offset, y: levelSpacing * 2 };
      });
      
      // Arrange any other devices
      others.forEach((node, i) => {
        const offset = (i - (others.length - 1) / 2) * spacing;
        positions[node.id] = { x: centerX + offset + spacing * 2, y: 0 };
      });
      
      // First disable physics and hierarchical layout
      visNetworkRef.current.setOptions({
        layout: {
          hierarchical: {
            enabled: false
          }
        },
        physics: { 
          enabled: false
        }
      });
      
      // Move nodes to calculated positions
      Object.entries(positions).forEach(([nodeId, position]) => {
        visNetworkRef.current.moveNode(nodeId, position.x, position.y);
      });
      
      // Fit the network to view
      visNetworkRef.current.fit({
        animation: {
          duration: 1000,
          easingFunction: 'easeInOutQuad'
        }
      });
      
      console.log('Network arranged in tiers - WAN/Routers/Switches/WLCs from top to bottom');
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

// Show interface labels positioned near their respective devices
window.showInterfaceLabels = (network, edge, connectionData, container) => {
  // Clear existing labels first
  window.clearInterfaceLabels(container);
  
  try {
    // Get positions of the connected nodes
    const fromPos = network.getPosition(edge.from);
    const toPos = network.getPosition(edge.to);
    
    // Calculate label positions along the edge, closer to each device
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    
    // Position labels at 25% and 75% along the edge
    const sourceX = fromPos.x + dx * 0.25;
    const sourceY = fromPos.y + dy * 0.25;
    const targetX = fromPos.x + dx * 0.75;
    const targetY = fromPos.y + dy * 0.75;
    
    // Convert network coordinates to canvas coordinates
    const sourceCanvasPos = network.canvasToDOM({ x: sourceX, y: sourceY });
    const targetCanvasPos = network.canvasToDOM({ x: targetX, y: targetY });
    
    // Create source interface label
    const sourceLabel = document.createElement('div');
    sourceLabel.className = 'interface-label';
    sourceLabel.style.cssText = `
      position: absolute;
      left: ${sourceCanvasPos.x}px;
      top: ${sourceCanvasPos.y}px;
      background: rgba(59, 130, 246, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(59, 130, 246, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    sourceLabel.textContent = window.abbreviateInterfaceName(connectionData.sourceInterface);
    
    // Create target interface label
    const targetLabel = document.createElement('div');
    targetLabel.className = 'interface-label';
    targetLabel.style.cssText = `
      position: absolute;
      left: ${targetCanvasPos.x}px;
      top: ${targetCanvasPos.y}px;
      background: rgba(16, 185, 129, 0.9);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      font-weight: bold;
      pointer-events: none;
      z-index: 1000;
      white-space: nowrap;
      transform: translate(-50%, -50%);
      border: 1px solid rgba(16, 185, 129, 1);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    `;
    targetLabel.textContent = window.abbreviateInterfaceName(connectionData.targetInterface);
    
    // Add labels to container
    container.appendChild(sourceLabel);
    container.appendChild(targetLabel);
    
    console.log('Interface labels shown for connection:', connectionData.id);
  } catch (error) {
    console.error('Error showing interface labels:', error);
  }
};

// Clear all interface labels
window.clearInterfaceLabels = (container) => {
  const labels = container.querySelectorAll('.interface-label');
  labels.forEach(label => label.remove());
};