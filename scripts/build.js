import { cpSync } from 'node:fs';
import { execSync } from 'node:child_process';

execSync('npm run build --workspace frontend', { stdio: 'inherit' });
cpSync('frontend/dist', 'dist', { recursive: true });
console.log('Build output prepared in both frontend/dist and dist.');
