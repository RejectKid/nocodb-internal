// Keep the Docker entry point and all upstream build behavior intact.
const path = require('node:path');
const base = require('../../packages/nocodb/rspack.timely.config.js');
module.exports = {
  ...base,
  entry: './src/run/docker.ts',
  output: {
    ...base.output,
    path: path.resolve(__dirname, '../../.handoff-build/backend'),
  },
};
