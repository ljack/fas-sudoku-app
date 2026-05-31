const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');
const manifestPath = path.join(__dirname, '../core/registry_manifest.ts');

console.log('[Build Prep] Generating registry manifest...');

if (!fs.existsSync(configPath)) {
  console.error('[Build Prep] Error: config.json not found!');
  process.exit(1);
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const activeFeatures = [];

  if (config.features) {
    for (const [featureName, isEnabled] of Object.entries(config.features)) {
      if (isEnabled === true) {
        // Verify folder and entry file exists
        const featureDir = path.join(__dirname, `../features/${featureName}`);
        const entryTs = path.join(featureDir, 'feature.ts');
        const entryJs = path.join(featureDir, 'feature.js');
        
        if (fs.existsSync(featureDir) && (fs.existsSync(entryTs) || fs.existsSync(entryJs))) {
          activeFeatures.push(featureName);
        } else {
          console.warn(`[Build Prep] Warning: Feature "${featureName}" is enabled in config.json, but features/${featureName}/feature.ts was not found on disk.`);
        }
      }
    }
  }

  // Create code content
  let code = `// AUTO-GENERATED - DO NOT EDIT DIRECTLY
import { FeatureRegistry } from './registry';

`;

  // Imports
  activeFeatures.forEach(feature => {
    code += `import { ${feature}Feature } from '../features/${feature}/feature';\n`;
  });

  code += `\nexport function registerActiveFeatures(registry: FeatureRegistry) {\n`;
  activeFeatures.forEach(feature => {
    code += `  registry.register(${feature}Feature);\n`;
  });
  code += `}\n`;

  fs.writeFileSync(manifestPath, code);
  console.log(`[Build Prep] Successfully wrote manifest for ${activeFeatures.length} active features: [${activeFeatures.join(', ')}]`);

} catch (err) {
  console.error('[Build Prep] Critical Error compiling manifest:', err.message);
  process.exit(1);
}
