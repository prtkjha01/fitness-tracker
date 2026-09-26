const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', '.expo/*', 'src/types/database.types.ts', 'supabase/*'],
  },
  {
    rules: {
      // All Supabase access goes through feature hooks (PRD §7)
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase',
              message: 'Import Supabase only from features/*/api.ts; components use feature hooks.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/api.ts', 'src/lib/**'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
