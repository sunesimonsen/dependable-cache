import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

const plugins = [
  typescript({
    tsconfig: "./tsconfig.json",
    declaration: false,
    outDir: "dist",
    rootDir: "src",
  }),
];

const minifyPlugins = [
  terser({
    compress: true,
    mangle: {
      reserved: [],
      properties: {
        regex: /^_/,
      },
    },
  }),
];

export default [
  {
    input: "src/Cache.ts",
    output: {
      file: "dist/dependable-cache.esm.js",
      format: "esm",
    },
    plugins,
    external: ["@dependable/state"],
  },
  {
    input: "src/Cache.ts",
    output: {
      file: "dist/dependable-cache.esm.min.js",
      format: "esm",
    },
    plugins: plugins.concat(minifyPlugins),
    external: ["@dependable/state"],
  },
];
