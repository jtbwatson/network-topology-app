// Custom hook for managing network data loading and parsing

window.useNetworkData = () => {
  const { useState, useEffect } = React;
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper function to extract metadata from D2 file content
  const extractMetadataFromD2 = (d2Content, filename) => {
    const lines = d2Content.split('\n');
    const metadata = {
      name: null,
      location: null,
      type: null,
      description: null
    };

    // Look for metadata in first few lines of comments
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('#')) {
        const comment = line.substring(1).trim();
        
        // Extract common patterns
        if (comment.toLowerCase().includes('site') || comment.toLowerCase().includes('network')) {
          metadata.description = comment;
        }
        if (comment.toLowerCase().includes('location:')) {
          metadata.location = comment.split(':')[1]?.trim();
        }
        if (comment.toLowerCase().includes('type:')) {
          metadata.type = comment.split(':')[1]?.trim().toLowerCase();
        }
      }
    }

    // Generate smart defaults based on filename and content
    if (!metadata.name) {
      metadata.name = filename
        .replace('.d2', '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }

    if (!metadata.type) {
      const fname = filename.toLowerCase();
      if (fname.includes('branch')) metadata.type = 'branch';
      else if (fname.includes('campus')) metadata.type = 'campus';
      else if (fname.includes('datacenter') || fname.includes('dc')) metadata.type = 'datacenter';
      else if (fname.includes('headquarters') || fname.includes('hq')) metadata.type = 'headquarters';
      else metadata.type = 'site';
    }

    if (!metadata.location) {
      metadata.location = metadata.name;
    }

    return metadata;
  };

  // Helper function to determine hierarchy from file path
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

  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        setLoading(true);
        console.log("📁 Scanning sites directory for D2 files...");

        // Scan the sites directory for all .d2 files
        const foundFiles = await window.fs.scanDirectory();
        
        if (foundFiles.length === 0) {
          throw new Error("No D2 files found in sites/ directory. Please add at least one .d2 file.");
        }

        console.log(`🔍 Found ${foundFiles.length} D2 files to load`);

        const loadedData = {
          sites: {},
          hierarchy: {}
        };

        // Load all discovered D2 files
        const loadPromises = foundFiles.map(async (fileInfo) => {
          try {
            console.log(`📄 Loading ${fileInfo.name}...`);
            const d2Content = await window.fs.readFile(fileInfo.path, { encoding: "utf8" });
            
            // Extract metadata from D2 content and filename
            const metadata = extractMetadataFromD2(d2Content, fileInfo.name);
            const hierarchy = getHierarchyFromPath(fileInfo.path);
            
            // Extract site info from D2 content using existing parser
            const siteInfo = window.extractSiteInfoFromD2(d2Content, metadata.name);
            
            // Create a clean key for the site
            const siteKey = fileInfo.name
              .replace('.d2', '')
              .replace(/\s+/g, '_')
              .toLowerCase();
            
            loadedData.sites[siteKey] = {
              site_info: {
                ...siteInfo,
                name: metadata.name,
                location: metadata.location,
                type: metadata.type,
                description: metadata.description,
                file_path: fileInfo.path,
                hierarchy: hierarchy
              },
              d2: d2Content,
            };

            console.log(`✅ Successfully loaded ${fileInfo.name} (${metadata.type})`, {
              siteKey,
              metadata,
              siteInfo: loadedData.sites[siteKey].site_info
            });
            return { fileName: fileInfo.name, success: true };
          } catch (fileError) {
            console.warn(`⚠️ Could not load ${fileInfo.name}:`, fileError.message);
            return { fileName: fileInfo.name, success: false, error: fileError };
          }
        });

        const loadResults = await Promise.all(loadPromises);
        
        // Check if we loaded at least one file
        const successfulLoads = loadResults.filter(result => result.success);
        if (successfulLoads.length === 0) {
          throw new Error("No D2 files could be loaded successfully. Please check file contents and permissions.");
        }

        console.log(`✅ Successfully loaded ${successfulLoads.length} of ${loadResults.length} D2 files`);
        setNetworkData(loadedData);
        setError(null);
      } catch (err) {
        console.error("❌ Error scanning/loading D2 files:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadNetworkData();
  }, []);

  return { networkData, loading, error };
};