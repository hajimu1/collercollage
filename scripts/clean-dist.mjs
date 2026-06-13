import { rm, mkdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const projectRoot = process.cwd();
const distDir = resolve(projectRoot, 'dist');
const relativeDist = relative(projectRoot, distDir);

if (relativeDist !== 'dist') {
  throw new Error(`Refusing to clean unexpected output directory: ${distDir}`);
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
