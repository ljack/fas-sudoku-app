const fs = require('fs');
const path = require('path');

const command = process.argv[2];
const featureName = process.argv[3];

const configPath = path.join(__dirname, '../config.json');
const featuresDir = path.join(__dirname, '../features');

function printUsage() {
  console.log(`
FAS Feature CLI Manager

Usage:
  npm run feature:scaffold <name>
  npm run feature:enable <name>
  npm run feature:disable <name>
  npm run feature:delete <name>
  `);
}

if (!command || !featureName) {
  printUsage();
  process.exit(1);
}

// Read and parse config.json
if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, JSON.stringify({ features: {} }, null, 2));
}

let config = { features: {} };
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (err) {
  console.error('Error reading config.json:', err.message);
  process.exit(1);
}

// Utility to write config.json
function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
}

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

// Command dispatcher
switch (command) {
  case 'scaffold':
    const targetDir = path.join(featuresDir, featureName);
    if (fs.existsSync(targetDir)) {
      console.error(`Error: Feature directory features/${featureName} already exists.`);
      process.exit(1);
    }
    
    // Create directory
    fs.mkdirSync(targetDir, { recursive: true });
    
    // Create README.md
    const readmeContent = `# Feature: ${featureName}

Requirements and design spec for the ${featureName} feature.

## DB Schema Setup
*   Registers schema setup in the \`onBoot\` hook.

## Route Enpoints
*   Exposes endpoints via \`context.router\`.
`;
    fs.writeFileSync(path.join(targetDir, 'README.md'), readmeContent);
    
    // Create feature.ts
    const templateContent = `import { FeatureModule, FeatureContext } from '../../core/registry';

export const ${featureName}Feature: FeatureModule = {
  name: '${featureName}',
  
  onBoot: async (context: FeatureContext) => {
    console.log('[Feature] Booting ${featureName}...');
    
    // 1. Dynamic DB Migrations (Stateless Bridge Adapter Pattern)
    context.db.registerMigration('${featureName}', \`
      CREATE TABLE IF NOT EXISTS ${featureName}_demo (
        id SERIAL PRIMARY KEY,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    \`);
    
    // 2. Register feature endpoints
    context.router.get('/api/${featureName}', async (req, res) => {
      try {
        const result = await context.db.query('SELECT * FROM ${featureName}_demo');
        res.json({ success: true, feature: '${featureName}', data: result.rows });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
      }
    });
  },

  onStart: async (context: FeatureContext) => {
    console.log('[Feature] Started ${featureName}.');
  },

  onShutdown: async (context: FeatureContext) => {
    console.log('[Feature] Shutdown ${featureName}.');
  }
};
`;
    fs.writeFileSync(path.join(targetDir, 'feature.ts'), templateContent);
    
    // Enable feature in config
    if (!config.features) config.features = {};
    config.features[featureName] = true;
    saveConfig(config);
    
    console.log(`\n\x1b[32m✔ Scaffolded features/${featureName} successfully.\x1b[0m`);
    console.log(`\x1b[32m✔ Added feature flag for "${featureName}" in config.json (set to true).\x1b[0m`);
    break;

  case 'enable':
    if (!config.features) config.features = {};
    config.features[featureName] = true;
    saveConfig(config);
    console.log(`\x1b[32m✔ Enabled feature "${featureName}" in config.json.\x1b[0m`);
    break;

  case 'disable':
    if (!config.features) config.features = {};
    config.features[featureName] = false;
    saveConfig(config);
    console.log(`\x1b[32m✔ Disabled feature "${featureName}" in config.json.\x1b[0m`);
    break;

  case 'delete':
    const folderToDelete = path.join(featuresDir, featureName);
    if (fs.existsSync(folderToDelete)) {
      deleteDir(folderToDelete);
      console.log(`\x1b[32m✔ Deleted directory: features/${featureName}\x1b[0m`);
    } else {
      console.log(`Warning: Directory features/${featureName} not found.`);
    }
    
    if (config.features && config.features[featureName] !== undefined) {
      delete config.features[featureName];
      saveConfig(config);
      console.log(`\x1b[32m✔ Removed feature flag for "${featureName}" from config.json.\x1b[0m`);
    }
    console.log(`\n\x1b[32m✔ Feature cleanup completed with 0 remnants.\x1b[0m`);
    break;

  default:
    console.error(`Error: Unknown command "${command}"`);
    printUsage();
    process.exit(1);
}
