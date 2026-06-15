import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  console.log('Building React app with Vite...');
  execSync('npx vite build', { stdio: 'inherit' });

  const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
  const pluginAssetsJsDir = path.join(process.cwd(), 'wordpress-plugin', 'ai-seo-auto-publisher-pro', 'assets', 'js');
  const pluginAssetsCssDir = path.join(process.cwd(), 'wordpress-plugin', 'ai-seo-auto-publisher-pro', 'assets', 'css');

  // Create plugin assets directories if they do not exist
  fs.mkdirSync(pluginAssetsJsDir, { recursive: true });
  fs.mkdirSync(pluginAssetsCssDir, { recursive: true });

  // Read built assets in dist/assets
  const files = fs.readdirSync(distAssetsDir);
  
  let jsCopied = false;
  let cssCopied = false;

  for (const file of files) {
    const filePath = path.join(distAssetsDir, file);
    if (file.endsWith('.js') && !jsCopied) {
      const destPath = path.join(pluginAssetsJsDir, 'admin.js');
      fs.copyFileSync(filePath, destPath);
      console.log(`Successfully copied JS asset: ${file} -> ${destPath}`);
      jsCopied = true;
    } else if (file.endsWith('.css') && !cssCopied) {
      const destPath = path.join(pluginAssetsCssDir, 'admin.css');
      fs.copyFileSync(filePath, destPath);
      console.log(`Successfully copied CSS asset: ${file} -> ${destPath}`);
      cssCopied = true;
    }
  }

  if (!jsCopied) {
    console.error('Warning: JS asset was not found or copied.');
  }
  if (!cssCopied) {
    console.error('Warning: CSS asset was not found or copied.');
  }

} catch (error) {
  console.error('Error during building and copying assets:', error);
  process.exit(1);
}
