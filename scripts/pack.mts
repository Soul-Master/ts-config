import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), '..');
const packageDir = path.join(rootDir, 'src');
const readmeSource = path.join(rootDir, 'README.md');
const readmeTarget = path.join(packageDir, 'README.md');
const npmCommand = process.env.npm_execpath === undefined
  ? process.platform === 'win32'
    ? 'npm.cmd'
    : 'npm'
  : process.execPath;
const npmArgsPrefix =
  process.env.npm_execpath === undefined ? [] : [process.env.npm_execpath];

function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

copyFileSync(readmeSource, readmeTarget);

try {
  run(
    npmCommand,
    [...npmArgsPrefix, 'pack', '--pack-destination', '..'],
    packageDir
  );
} finally {
  run('git', ['clean', '-fd', '--', 'src'], rootDir);
}
