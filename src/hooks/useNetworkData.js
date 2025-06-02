// Custom hook for managing network data loading and parsing
// Updated to use FastAPI backend instead of direct file access

window.useNetworkData = () => {
  const { useState, useEffect } = React;
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detect if we're running with the API backend
  const API_BASE_URL = window.location.port === '8000' ? '' : 'http://localhost:8000';
  const useAPI = true; // Can be made configurable later

  // Helper function to determine hierarchy from file path (keeping for compatibility)
  const getHierarchyFromPath = (filePath) => {
    const pathParts = filePath.split('/').filter(part => part && part !== '.');
    const filename = pathParts[pathParts.length - 1];
    const directories = pathParts.slice(0, -1);

    return {
      region: directories[0] || null,
      country: directories[1] || null, 
      state: directories[2] || null,
      city: directories[3] || null,
      depth: directories.length,
      breadcrumb: directories.join(' / ') || 'Root'
    };
  };

  // Load data from API
  const loadFromAPI = async () => {
    try {
      console.log("🚀 Loading network data from API...");
      
      const response = await fetch(`${API_BASE_URL}/api/sites`);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const apiData = await response.json();
      
      if (!apiData.sites || Object.keys(apiData.sites).length === 0) {
        throw new Error("No sites found in API response");
      }

      console.log(`✅ Successfully loaded ${Object.keys(apiData.sites).length} sites from API`);
      
      // Process API data to match expected frontend format
      const processedData = {
        sites: {},
        hierarchy: {}
      };

      Object.entries(apiData.sites).forEach(([siteKey, siteData]) => {
        // Add hierarchy info if not present
        if (!siteData.site_info.hierarchy) {
          siteData.site_info.hierarchy = getHierarchyFromPath(siteData.file_path);
        }
        
        processedData.sites[siteKey] = siteData;
        
        console.log(`📊 Processed site: ${siteKey}`, {
          name: siteData.site_info.name,
          location: siteData.site_info.location,
          devices: siteData.site_info.devices_count,
          type: siteData.site_info.type || 'site'
        });
      });

      return processedData;
      
    } catch (err) {
      console.error("❌ API Error:", err);
      throw new Error(`Failed to load data from API: ${err.message}`);
    }
  };

  // Fallback to direct file access (legacy support)
  const loadFromFiles = async () => {
    try {
      console.log("📁 Fallback: Loading from files directly...");
      
      if (!window.fs) {
        throw new Error("File system not available and API not accessible");
      }

      // Use the original file-based loading logic
      const foundFiles = await window.fs.scanDirectory();
      
      if (foundFiles.length === 0) {
        throw new Error("No D2 files found in sites/ directory");
      }

      const loadedData = { sites: {}, hierarchy: {} };

      const loadPromises = foundFiles.map(async (fileInfo) => {
        try {
          const d2Content = await window.fs.readFile(fileInfo.path, { encoding: "utf8" });
          
          // Extract site info from D2 content
          const siteInfo = window.extractSiteInfoFromD2(d2Content, fileInfo.name);
          const hierarchy = getHierarchyFromPath(fileInfo.path);
          
          const siteKey = fileInfo.name
            .replace('.d2', '')
            .replace(/\s+/g, '_')
            .toLowerCase();
          
          loadedData.sites[siteKey] = {
            site_info: {
              ...siteInfo,
              file_path: fileInfo.path,
              hierarchy: hierarchy
            },
            d2: d2Content,
          };

          return { fileName: fileInfo.name, success: true };
        } catch (fileError) {
          console.warn(`⚠️ Could not load ${fileInfo.name}:`, fileError.message);
          return { fileName: fileInfo.name, success: false, error: fileError };
        }
      });

      const loadResults = await Promise.all(loadPromises);
      const successfulLoads = loadResults.filter(result => result.success);
      
      if (successfulLoads.length === 0) {
        throw new Error("No D2 files could be loaded successfully");
      }

      console.log(`✅ Loaded ${successfulLoads.length} files via fallback method`);
      return loadedData;
      
    } catch (err) {
      console.error("❌ File loading error:", err);
      throw err;
    }
  };

  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        setLoading(true);
        setError(null);

        let data;
        
        if (useAPI) {
          try {
            data = await loadFromAPI();
          } catch (apiError) {
            console.warn("⚠️ API unavailable, falling back to direct file access");
            data = await loadFromFiles();
          }
        } else {
          data = await loadFromFiles();
        }

        setNetworkData(data);
        
      } catch (err) {
        console.error("❌ Error loading network data:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadNetworkData();
  }, []);

  return { networkData, loading, error };
};