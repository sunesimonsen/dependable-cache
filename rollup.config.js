import { terser } from "rollup-plugin-terser";

const plugins = [];
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
    input: "src/Cache.js",
    output: {
      file: "dist/dependable-cache.esm.js",
      format: "esm",
    },
    plugins,
  },
  {
    input: "src/Cache.js",
    output: {
      file: "dist/dependable-cache.esm.min.js",
      format: "esm",
    },
    plugins: plugins.concat(minifyPlugins),
  },
];
