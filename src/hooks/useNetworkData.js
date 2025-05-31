// Custom hook for managing network data loading and parsing

window.useNetworkData = () => {
  const { useState, useEffect } = React;
  const [networkData, setNetworkData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNetworkData = async () => {
      try {
        setLoading(true);
        console.log("📁 Loading network data from D2 files...");

        const [branchD2, campusD2, datacenterD2] = await Promise.all([
          window.fs.readFile("branch.d2", { encoding: "utf8" }),
          window.fs.readFile("campus.d2", { encoding: "utf8" }),
          window.fs.readFile("datacenter.d2", { encoding: "utf8" }),
        ]);

        // Parse each D2 file to extract site info dynamically
        const branchInfo = window.extractSiteInfoFromD2(branchD2, "Branch Office");
        const campusInfo = window.extractSiteInfoFromD2(campusD2, "Campus Network");
        const datacenterInfo = window.extractSiteInfoFromD2(datacenterD2, "Data Center");

        const loadedData = {
          sites: {
            branch: {
              site_info: branchInfo,
              d2: branchD2,
            },
            campus: {
              site_info: campusInfo,
              d2: campusD2,
            },
            datacenter: {
              site_info: datacenterInfo,
              d2: datacenterD2,
            },
          },
        };

        console.log("✅ Successfully loaded data from D2 files");
        setNetworkData(loadedData);
        setError(null);
      } catch (err) {
        console.error("❌ Error loading D2 files:", err);
        setError(err);

        if (err.message.includes("Failed to load")) {
          setError(
            new Error(
              "Cannot find D2 files. Please ensure branch.d2, campus.d2, and datacenter.d2 are in the data/ directory."
            )
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadNetworkData();
  }, []);

  return { networkData, loading, error };
};