module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*",
    ".eslintrc.js",
    "*.config.js",
    "src_OLD_BACKUP_*/**/*", // Exclude backup directories
  ],
  plugins: [
    "@typescript-eslint",
    "import",
    "unused-imports",
    "prettier",
  ],
  rules: {
    // Prettier integration
    "prettier/prettier": "error",
    
    // Code quality
    "quotes": ["error", "double"],
    "indent": "off", // Let Prettier handle indentation
    "max-len": "off", // Let Prettier handle line length
    "linebreak-style": 0,
    
    // Import rules
    "import/no-unresolved": 0,
    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        "newlines-between": "always",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true,
        },
      },
    ],
    
    // Unused imports
    "unused-imports/no-unused-imports": "error",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        "vars": "all",
        "varsIgnorePattern": "^_",
        "args": "after-used",
        "argsIgnorePattern": "^_",
      },
    ],
    
    // TypeScript specific
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": [
      "warn",
      {
        "allowExpressions": true,
        "allowTypedFunctionExpressions": true,
      },
    ],
    
    // Disable conflicting rules
    "@typescript-eslint/indent": "off", // Let Prettier handle this
  },
};
