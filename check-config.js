console.log("Checking localStorage autoSyncConfig...");
const config = localStorage.getItem("autoSyncConfig");
if (config) {
  const parsed = JSON.parse(config);
  console.log("Current config:", parsed);
  if (parsed.branch) console.log("BRANCH:", parsed.branch);
}
