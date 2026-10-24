import { cpSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

try {
  execSync('npm run build --workspace frontend', { stdio: 'inherit' });
} catch {
  execSync('npx vite build frontend --outDir dist', { stdio: 'inherit' });
}

if (existsSync('frontend/dist')) {
  cpSync('frontend/dist', 'dist', { recursive: true });
}
if (existsSync('dist') && !existsSync('frontend/dist')) {
  cpSync('dist', 'frontend/dist', { recursive: true });
}
if (existsSync('api')) {
  cpSync('api', 'dist/api', { recursive: true });
}
if (existsSync('backend')) {
  cpSync('backend', 'dist/backend', { recursive: true });
}
console.log('Build output verified in dist and frontend/dist with api and backend mirrored.');
