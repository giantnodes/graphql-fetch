import type { Options } from 'tsup'

import { defineConfig } from 'tsup'

const config: Options = {
  clean: true,
  minify: true,
  silent: true,
  dts: true,
  treeshake: false,
  sourcemap: false,
  splitting: false,
  format: ['esm'],
  outDir: 'dist',
  target: ['node14', 'node16'],
  tsconfig: 'tsconfig.json',
}

export { config }
export default defineConfig({ ...config })
