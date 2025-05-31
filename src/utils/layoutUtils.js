// Layout utility functions for D3 network visualization

// Reset layout function
window.resetLayout = (simulationRef) => {
  if (simulationRef.current) {
    simulationRef.current.nodes().forEach((node) => {
      node.fx = null;
      node.fy = null;
    });
    simulationRef.current.alpha(1).restart();
  }
};

// Auto-arrange layout function
window.autoArrangeLayout = (simulationRef, svgRef) => {
  if (simulationRef.current) {
    const nodes = simulationRef.current.nodes();
    const width = svgRef.current?.clientWidth || 800;
    const height = svgRef.current?.clientHeight || 600;

    nodes.forEach((node) => {
      node.fx = null;
      node.fy = null;
    });

    const routers = nodes.filter((n) => n.type === "router");
    const switches = nodes.filter((n) => n.type === "switch");
    const firewalls = nodes.filter((n) => n.type === "firewall");
    const wlcs = nodes.filter((n) => n.type === "wireless_controller");

    routers.forEach((node, i) => {
      node.fx = (width / (routers.length + 1)) * (i + 1);
      node.fy = height * 0.2;
    });

    switches.forEach((node, i) => {
      node.fx = (width / (switches.length + 1)) * (i + 1);
      node.fy = height * 0.5;
    });

    firewalls.forEach((node, i) => {
      node.fx = (width / (firewalls.length + 1)) * (i + 1);
      node.fy = height * 0.35;
    });

    wlcs.forEach((node, i) => {
      node.fx = (width / (wlcs.length + 1)) * (i + 1);
      node.fy = height * 0.8;
    });

    simulationRef.current.alpha(0.3).restart();
    setTimeout(() => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    }, 1000);
  }
};

// Process links for multiple connections between same devices
window.processLinksForCurves = (links) => {
  // Group links by device pairs to handle multiple connections
  const linkGroups = new Map();
  links.forEach(link => {
    const key1 = `${link.source}-${link.target}`;
    const key2 = `${link.target}-${link.source}`;
    const key = linkGroups.has(key1) ? key1 : (linkGroups.has(key2) ? key2 : key1);
    
    if (!linkGroups.has(key)) {
      linkGroups.set(key, []);
    }
    linkGroups.get(key).push(link);
  });

  // Add curve offset to multiple links between same devices
  linkGroups.forEach(links => {
    if (links.length > 1) {
      links.forEach((link, index) => {
        // Calculate curve offset - spread links evenly
        const totalLinks = links.length;
        const linkIndex = index - Math.floor(totalLinks / 2);
        link.curveOffset = linkIndex * 20; // 20px spacing between parallel links
      });
    } else {
      links[0].curveOffset = 0; // No curve for single links
    }
  });

  return links;
};