module.exports = {
  // String formatting
  singleQuote: false, // Use double quotes (matches Google style)
  quoteProps: "as-needed",
  
  // Code style
  printWidth: 100, // Match max-len from ESLint
  tabWidth: 2,
  useTabs: false,
  semi: true,
  
  // Trailing commas
  trailingComma: "es5", // ES5-compatible trailing commas
  
  // Brackets and spacing
  bracketSpacing: true,
  arrowParens: "always",
  
  // Line endings
  endOfLine: "auto", // Auto-detect to handle cross-platform
  
  // Special file overrides
  overrides: [
    {
      files: "*.json",
      options: {
        printWidth: 80,
      },
    },
  ],
};
