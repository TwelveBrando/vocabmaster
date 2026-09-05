import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { rolldown } from 'rolldown';
const outputFile = 'node_modules/.tmp/local-grammar.test.mjs';
await mkdir('node_modules/.tmp', { recursive: true });
const bundle = await rolldown({ input: 'scripts/local-grammar.test.ts', platform: 'node' });
await bundle.write({ file: outputFile, format: 'esm' });
await import(`${pathToFileURL(outputFile).href}?run=${Date.now()}`);
