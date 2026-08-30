import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';

const outputFile = 'node_modules/.tmp/grammar-generation.test.mjs';
await mkdir('node_modules/.tmp', { recursive: true });

const bundle = await rolldown({
  input: 'scripts/grammar-generation.test.ts',
  platform: 'node',
});
await bundle.write({ file: outputFile, format: 'esm' });
await import(`${pathToFileURL(outputFile).href}?run=${Date.now()}`);
