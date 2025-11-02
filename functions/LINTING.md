# ESLint & Prettier Setup

This project uses ESLint and Prettier to maintain code quality and consistent formatting.

## Installed Tools

- **ESLint**: Linting tool for identifying and reporting on patterns in TypeScript/JavaScript
- **Prettier**: Opinionated code formatter
- **@typescript-eslint/parser**: TypeScript parser for ESLint
- **@typescript-eslint/eslint-plugin**: TypeScript-specific linting rules
- **eslint-plugin-import**: Import/export syntax linting
- **eslint-plugin-unused-imports**: Detects and removes unused imports
- **eslint-plugin-prettier**: Runs Prettier as an ESLint rule
- **eslint-config-prettier**: Disables ESLint rules that conflict with Prettier

## Available Scripts

### Linting

```bash
# Check for linting errors
npm run lint

# Automatically fix linting errors
npm run lint:fix
```

### Formatting

```bash
# Format all files
npm run format

# Check if files are formatted correctly (without changing them)
npm run format:check
```

### Combined Commands

```bash
# Run all checks (lint + format check)
npm run check

# Fix all issues (lint fix + format)
npm run fix
```

## Configuration Files

### `.eslintrc.js`
- Extends Google style guide and TypeScript recommended rules
- Configured with import organization rules
- Removes unused imports automatically
- Integrates with Prettier

### `.prettierrc.js`
- Uses double quotes (Google style)
- 100 character line width
- 2 space indentation
- Trailing commas in ES5 style

### `.prettierignore`
- Excludes build output (`lib/`, `dist/`)
- Excludes dependencies (`node_modules/`)
- Excludes backup directories

## VS Code Integration

### Recommended Extensions
- **ESLint** (`dbaeumer.vscode-eslint`)
- **Prettier** (`esbenp.prettier-vscode`)

### Workspace Settings
The `.vscode/settings.json` file is configured to:
- Format on save
- Fix ESLint issues on save
- Organize imports on save

## Rules Highlights

### Code Quality
- Unused imports are automatically removed
- Import statements are organized and sorted alphabetically
- TypeScript explicit return types are warned (not required for arrow functions)
- `any` type usage triggers warnings

### Formatting
- Double quotes for strings
- 2-space indentation
- 100 character max line length
- Trailing commas in objects/arrays (ES5 compatible)
- Semicolons required

## Pre-Deploy

The deploy script automatically runs linting and formatting checks:

```bash
npm run deploy
```

This ensures only properly formatted and linted code is deployed to production.

## Fixing Common Issues

### Too many linting errors
Run the auto-fix command:
```bash
npm run lint:fix
```

### Formatting issues
Run Prettier:
```bash
npm run format
```

### Both linting and formatting
Run the combined fix command:
```bash
npm run fix
```

## Ignored Files

The following are excluded from linting/formatting:
- `lib/**/*` - Compiled JavaScript output
- `src_OLD_BACKUP_*/**/*` - Backup directories
- `node_modules/` - Dependencies
- `*.config.js` - Configuration files

## Current Status

After initial setup, the project has:
- ✅ 877 errors automatically fixed
- ⚠️ 168 JSDoc documentation warnings (requires manual fixes)
- ⚠️ 52 TypeScript `any` type warnings (requires manual fixes)

These remaining issues are warnings and don't block the build process, but should be addressed gradually to improve code quality.
