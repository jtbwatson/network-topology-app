// Custom hook for D3 visualization management

window.useVisualization = ({
  svgRef,
  networkData,
  selectedTopology,
  setInterfacesData,
  setSelectedDevice,
  setSelectedConnection,
  setShowAPModal,
  setShowRoutingTableModal
}) => {
  const { useEffect, useRef } = React;
  const simulationRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !networkData) return;

    d3.select(svgRef.current).selectAll("*").remove();

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const topology = networkData?.sites[selectedTopology];
    if (!topology) return;

    const graphData = window.parseD2ToGraph(topology.d2);

    // Store interfaces data for connection details
    setInterfacesData(graphData.interfaces || new Map());

    // Process links for curved connections
    const processedLinks = window.processLinksForCurves(graphData.links);

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    const simulation = d3
      .forceSimulation(graphData.nodes)
      .force(
        "link",
        d3
          .forceLink(processedLinks)
          .id((d) => d.id)
          .distance(300)
          .strength(0.6)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80).strength(1))
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    simulationRef.current = simulation;

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoom);

    const container = svg.append("g");

    // Create curved paths for links instead of straight lines
    const link = container
      .append("g")
      .selectAll("path")
      .data(processedLinks)
      .enter()
      .append("path")
      .attr("stroke", "#6B7280")
      .attr("stroke-width", 3)
      .attr("stroke-opacity", 0.8)
      .attr("fill", "none")
      .style("cursor", "pointer");

    const node = container
      .append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer")
      .call(
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

    node
      .append("circle")
      .attr("r", (d) => {
        if (d.type === "router" || d.type === "wireless_controller") return 40;
        if (d.type === "switch" || d.type === "firewall") return 35;
        return 30;
      })
      .attr("fill", (d) => window.getDeviceColor(d.type))
      .attr("stroke", (d) => d3.rgb(window.getDeviceColor(d.type)).darker())
      .attr("stroke-width", 2);

    node
      .append("text")
      .text((d) => {
        // Use the label from D2 file, fallback to device ID
        return d.label || d.id;
      })
      .attr("text-anchor", "middle")
      .attr("dy", 60)
      .attr("font-size", "12px")
      .attr("font-family", "Arial, sans-serif")
      .attr("font-weight", "600")
      .attr("fill", "#e5e7eb")
      .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.7)");

    node
      .append("text")
      .text((d) => window.getDeviceIcon(d.type))
      .attr("text-anchor", "middle")
      .attr("dy", 8)
      .attr("font-size", "20px");

    node.on("click", (event, d) => {
      event.stopPropagation();
      setSelectedDevice(d);
      setSelectedConnection(null);
      setShowAPModal(false);
      setShowRoutingTableModal(false);

      node.selectAll("circle").attr("stroke-width", 2);
      d3.select(event.currentTarget).select("circle").attr("stroke-width", 4);
    });

    link.on("click", (event, d) => {
      event.stopPropagation();
      
      // D3 transforms the links during simulation, so d.source and d.target become node objects
      const sourceNode = typeof d.source === 'object' ? d.source : graphData.nodes.find(n => n.id === d.source);
      const targetNode = typeof d.target === 'object' ? d.target : graphData.nodes.find(n => n.id === d.target);

      console.log("🔗 Raw link data from D3:", d);
      console.log("🔗 Source/Target nodes:", { sourceNode: sourceNode?.id, targetNode: targetNode?.id });

      // The original link data should be preserved in the D3 link object
      const sourceInterface = d.sourceInterface || "unknown";
      const targetInterface = d.targetInterface || "unknown";
      const sourceInterfaceKey = d.sourceInterfaceKey || "";
      const targetInterfaceKey = d.targetInterfaceKey || "";

      console.log("🔗 Interface data from link:", {
        sourceInterface,
        targetInterface,
        sourceInterfaceKey,
        targetInterfaceKey
      });

      setSelectedConnection({
        id: `${sourceNode.id}-${targetNode.id}`,
        source: sourceNode,
        target: targetNode,
        sourceInterface: sourceInterface,
        targetInterface: targetInterface,
        sourceInterfaceKey: sourceInterfaceKey,
        targetInterfaceKey: targetInterfaceKey,
      });
      setSelectedDevice(null);
      setShowAPModal(false);
      setShowRoutingTableModal(false);

      link.attr("stroke-width", 3).attr("stroke", "#6B7280");
      d3.select(event.currentTarget)
        .attr("stroke-width", 5)
        .attr("stroke", "#EF4444");
    });

    svg.on("click", () => {
      setSelectedDevice(null);
      setSelectedConnection(null);
      setShowAPModal(false);
      setShowRoutingTableModal(false);

      node.selectAll("circle").attr("stroke-width", 2);
      link.attr("stroke-width", 3).attr("stroke", "#6B7280");
    });

    simulation.on("tick", () => {
      link.attr("d", (d) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // If there's a curve offset, create a curved path
        if (d.curveOffset && d.curveOffset !== 0) {
          // Calculate the midpoint
          const midX = (d.source.x + d.target.x) / 2;
          const midY = (d.source.y + d.target.y) / 2;
          
          // Calculate perpendicular offset for curve
          const offsetX = -dy / dr * d.curveOffset;
          const offsetY = dx / dr * d.curveOffset;
          
          // Create quadratic curve
          return `M${d.source.x},${d.source.y} Q${midX + offsetX},${midY + offsetY} ${d.target.x},${d.target.y}`;
        } else {
          // Straight line for single connections
          return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
        }
      });

      node.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
    });

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
    }

    return () => {
      if (simulation) {
        simulation.stop();
      }
    };
  }, [selectedTopology, networkData, setInterfacesData, setSelectedDevice, setSelectedConnection, setShowAPModal, setShowRoutingTableModal]);

  return { simulationRef };
};