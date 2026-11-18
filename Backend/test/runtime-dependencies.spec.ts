import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('production bootstrap dependencies', () => {
  it('can construct the global Nest validation pipe used at startup', () => {
    const result = spawnSync(process.execPath, ['-e', "const { ValidationPipe } = require('@nestjs/common'); new ValidationPipe({ transform: true, whitelist: true });"], { cwd: process.cwd(), encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
  });
});
