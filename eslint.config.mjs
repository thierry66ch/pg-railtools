// Config ESLint pour packages/* (packages/commun, packages/module-*).
// apps/portail a sa propre config (eslint-config-next), trouvée en priorité par ESLint
// puisqu'elle est plus proche du répertoire courant lors du lint de cette app.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Projet non ciblé par React Compiler : le chargement initial depuis
      // localStorage dans un effet (setState au montage) est un pattern voulu.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
);
