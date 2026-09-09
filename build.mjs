import { mkdir, copyFile, cp } from 'node:fs/promises';

const output = new URL('./dist/', import.meta.url);
await mkdir(output, { recursive: true });
for (const file of ['index.html', 'style.css']) {
  await copyFile(new URL(file, import.meta.url), new URL(file, output));
}
await cp(new URL('./src/', import.meta.url), new URL('./src/', output), { recursive: true });
await cp(new URL('./assets/', import.meta.url), new URL('./assets/', output), { recursive: true });
console.log('Static game built in dist/');
