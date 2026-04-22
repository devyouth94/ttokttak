const { defineConfig } = require("eslint/config");
const eslintConfigPrettier = require("eslint-config-prettier");
const expoConfig = require("eslint-config-expo/flat");
const eslintPluginPrettier = require("eslint-plugin-prettier");
const simpleImportSort = require("eslint-plugin-simple-import-sort");

module.exports = defineConfig([
  {
    ignores: [
      "dist/*",
      ".expo/*",
      "node_modules/*",
      "ios/*",
      "android/*",
      "supabase/functions/**/*",
    ],
  },
  expoConfig,
  eslintConfigPrettier,
  {
    plugins: {
      prettier: eslintPluginPrettier,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "arrow-body-style": "off",
      "prefer-arrow-callback": "off",
      "prettier/prettier": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            ["^react", "^expo", "^@?\\w"],
            ["^~/"],
            ["^\\./", "^\\.\\./"],
            ["^\\.css$"],
          ],
        },
      ],
    },
  },
]);
