const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const configPath = path.join(__dirname, '../config.json');
const featuresDir = path.join(__dirname, '../features');
const tempDir = path.join(__dirname, '../.remnant_temp');

console.log('[Remnant Scan] Starting automated Zero-Remnant verification matrix...');

// Read initial config
if (!fs.existsSync(configPath)) {
  console.error('config.json not found!');
  process.exit(1);
}

const originalConfigText = fs.readFileSync(configPath, 'utf8');
const originalConfig = JSON.parse(originalConfigText);

// Gather all features on disk
const featuresOnDisk = fs.readdirSync(featuresDir).filter(file => {
  const fullPath = path.join(featuresDir, file);
  return fs.statSync(fullPath).isDirectory() && 
         (fs.existsSync(path.join(fullPath, 'feature.ts')) || fs.existsSync(path.join(fullPath, 'feature.js')));
});

if (featuresOnDisk.length === 0) {
  console.log('[Remnant Scan] No features found on disk to verify. Passing.');
  process.exit(0);
}

console.log(`[Remnant Scan] Found ${featuresOnDisk.length} feature(s) to verify: [${featuresOnDisk.join(', ')}]`);

// Helper to remove directory recursively
function deleteDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteDir(curPath);
      } else {
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dirPath);
  }
}

// Ensure temp dir exists and is empty
deleteDir(tempDir);
fs.mkdirSync(tempDir, { recursive: true });

let failedFeatures = [];

for (const featureName of featuresOnDisk) {
  console.log(`\n--------------------------------------------------`);
  console.log(`[Remnant Scan] Testing isolation of feature: "${featureName}"`);
  
  const sourcePath = path.join(featuresDir, featureName);
  const backupPath = path.join(tempDir, featureName);
  
  // 1. Move directory out
  try {
    fs.renameSync(sourcePath, backupPath);
  } catch (err) {
    console.error(`Failed to move features/${featureName} to temp directory:`, err.message);
    restoreAll(originalConfigText);
    process.exit(1);
  }
  
  // 2. Set flag to false in config
  let tempConfig = JSON.parse(originalConfigText);
  if (!tempConfig.features) tempConfig.features = {};
  tempConfig.features[featureName] = false;
  fs.writeFileSync(configPath, JSON.stringify(tempConfig, null, 2));
  
  // 3. Build & Compile Test (fails if other code statically imports the removed feature)
  try {
    console.log(`[Remnant Scan] Compiling codebase without "${featureName}"...`);
    // Run pre-build and compile check
    execSync('npm run build:prep && npx tsc --noEmit', { stdio: 'inherit' });
    console.log(`\x1b[32m✔ Isolation verified! Feature "${featureName}" compiles cleanly when removed.\x1b[0m`);
  } catch (error) {
    console.error(`\x1b[31m❌ Remnant Violation! Compile failed when features/${featureName} was removed.\x1b[0m`);
    console.error(`This indicates that core files or other features have static imports referencing this feature folder.`);
    failedFeatures.push(featureName);
  }
  
  // 4. Restore directory
  try {
    fs.renameSync(backupPath, sourcePath);
  } catch (err) {
    console.error(`CRITICAL: Failed to restore features/${featureName} from temp directory!`, err.message);
    process.exit(1);
  }
}

// Final cleanup and restore original config
restoreAll(originalConfigText);

if (failedFeatures.length > 0) {
  console.error(`\n\x1b[31m❌ Zero-Remnant Matrix check failed for: ${failedFeatures.join(', ')}\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\n\x1b[32m✔ All features passed Zero-Remnant isolation checks successfully.\x1b[0m`);
  process.exit(0);
}

function restoreAll(originalConfigJson) {
  // Restore config.json
  fs.writeFileSync(configPath, originalConfigJson);
  // Remove temp directory
  deleteDir(tempDir);
}
