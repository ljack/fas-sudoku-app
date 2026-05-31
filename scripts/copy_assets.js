const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../features');
const destDir = path.join(__dirname, '../dist/features');

console.log('[Asset Copy] Copying static assets from features/ to dist/features/...');

function copyRecursive(src, dest) {
  if (fs.existsSync(src)) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(child => {
        copyRecursive(path.join(src, child), path.join(dest, child));
      });
    } else if (stat.isFile()) {
      // Avoid copying TS source files, only copy non-compiled assets
      const ext = path.extname(src);
      if (['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.json', '.md'].includes(ext)) {
        fs.copyFileSync(src, dest);
      }
    }
  }
}

// Copy
if (fs.existsSync(srcDir)) {
  copyRecursive(srcDir, destDir);
  console.log('[Asset Copy] Static assets successfully copied.');
} else {
  console.warn('[Asset Copy] Warning: features/ directory not found, skipping asset copy.');
}
