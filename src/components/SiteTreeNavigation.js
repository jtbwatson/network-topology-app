// Simple hierarchical tree navigation component
window.SiteTreeNavigation = ({ 
  networkData, 
  selectedTopology, 
  onTopologyChange 
}) => {
  const { useState } = React;
  const [expandedRegions, setExpandedRegions] = useState(new Set(['amer']));

  if (!networkData?.hierarchy) {
    return React.createElement('div', {
      className: "p-4 text-gray-400 text-sm"
    }, "No hierarchical data available");
  }

  const toggleRegion = (regionKey) => {
    const newExpanded = new Set(expandedRegions);
    if (newExpanded.has(regionKey)) {
      newExpanded.delete(regionKey);
    } else {
      newExpanded.add(regionKey);
    }
    setExpandedRegions(newExpanded);
  };

  const renderTreeNode = (key, node, depth = 0, parentPath = '') => {
    const paddingLeft = depth * 20;
    const isExpanded = expandedRegions.has(key);
    
    if (node.type === 'region') {
      const children = [];
      
      // Region header
      children.push(
        React.createElement('div', {
          key: `${key}-header`,
          className: `flex items-center p-2 cursor-pointer hover:bg-gray-700 text-yellow-300 ${depth === 0 ? 'font-bold text-yellow-400 border-l-2 border-yellow-400' : 'font-semibold'}`,
          style: { paddingLeft: `${paddingLeft + 8}px` },
          onClick: () => toggleRegion(key)
        }, [
          React.createElement('span', { key: 'icon', className: 'mr-2 text-lg' }, isExpanded ? '📂' : '📁'),
          React.createElement('span', { key: 'text', className: 'uppercase tracking-wide' }, key),
          React.createElement('span', { key: 'count', className: 'ml-auto text-xs text-gray-400' }, 
            node.children ? `${Object.keys(node.children).length}` : '0')
        ])
      );
      
      // Region children (if expanded)
      if (isExpanded && node.children) {
        Object.entries(node.children).forEach(([childKey, childNode]) => {
          children.push(renderTreeNode(childKey, childNode, depth + 1, parentPath ? `${parentPath}.${key}` : key));
        });
      }
      
      return React.createElement('div', { key }, children);
      
    } else if (node.type === 'site') {
      const fullSiteKey = parentPath ? `${parentPath}.${key}` : key;
      const isSelected = selectedTopology === fullSiteKey;
      
      return React.createElement('div', {
        key,
        className: `flex items-center p-2 cursor-pointer transition-colors duration-150 ${
          isSelected 
            ? 'bg-blue-600 text-white border-l-2 border-blue-400' 
            : 'text-gray-100 hover:bg-gray-700 hover:text-white border-l-2 border-transparent'
        }`,
        style: { paddingLeft: `${paddingLeft + 16}px` },
        onClick: () => onTopologyChange(fullSiteKey)
      }, [
        React.createElement('span', { key: 'icon', className: 'mr-2 text-sm' }, '📄'),
        React.createElement('span', { key: 'text', className: 'truncate flex-1' }, node.data.site_info.name),
        node.data.site_info.type === 'multi_file' ? 
          React.createElement('span', { 
            key: 'multi', 
            className: 'ml-1 text-xs bg-green-600 text-white px-1 rounded',
            title: 'Multi-file site'
          }, '📚') : null,
        React.createElement('span', { 
          key: 'device-count', 
          className: 'ml-2 text-xs text-gray-400' 
        }, `${node.data.site_info.devices_count || 0}`)
      ].filter(Boolean));
    }
    
    return null;
  };

  return React.createElement('div', {
    className: "site-tree-navigation flex flex-col h-full"
  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      className: "p-3 border-b border-gray-700"
    }, [
      React.createElement('h2', {
        key: 'title',
        className: "text-lg font-semibold text-gray-100 flex items-center space-x-2"
      }, [
        React.createElement('span', { key: 'icon' }, '🌐'),
        React.createElement('span', { key: 'text' }, 'Network Sites')
      ])
    ]),
    
    // Tree content
    React.createElement('div', {
      key: 'content',
      className: "overflow-y-auto flex-1"
    }, Object.entries(networkData.hierarchy || {}).map(([key, node]) =>
      renderTreeNode(key, node, 0, '')
    )),
    
    // Footer
    React.createElement('div', {
      key: 'footer',
      className: "p-3 border-t border-gray-700 text-xs text-gray-400"
    }, [
      React.createElement('div', {
        key: 'info',
        className: "flex items-center space-x-2"
      }, [
        React.createElement('span', { key: 'icon' }, 'ℹ️'),
        React.createElement('span', { key: 'text' }, `${Object.keys(networkData.sites).length} sites total`)
      ])
    ])
  ]);
};