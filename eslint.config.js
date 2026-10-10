const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    // promo/ is its own Remotion workspace with its own tsconfig and node_modules.
    ignores: ['dist/*', 'drizzle/*', 'node_modules/*', 'ios/*', 'android/*', 'promo/*'],
  },
]);
