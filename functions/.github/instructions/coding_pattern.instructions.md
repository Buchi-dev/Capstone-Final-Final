---
applyTo: '**'
---
rules:
  ArchitectureAndOrganization:
    - Maintain modular directory structure:
        - auth/
        - callable/
        - config/
        - constants/
        - types/
        - utils/
    - Ensure consistent barrel export pattern (index.ts in every directory)
    - Enforce clear separation of concerns
    - Maintain proper dependency flow (no circular dependencies)

  TypeSafety:
    - Enable strict TypeScript configuration ("strict": true in tsconfig.json)
    - Ensure all functions are properly typed (parameters and return types)
    - Use a single source of truth for:
        - UserStatus
        - UserRole
      location: userManagement.constants.ts
    - Prevent duplicate type definitions
    - Define request/response interfaces for all callable operations

  ConstantsManagement:
    - Centralize constants in dedicated files
    - Prohibit hardcoded strings in business logic
    - Maintain consistent error message structure: USER_MANAGEMENT_ERRORS
    - Maintain consistent success message structure: USER_MANAGEMENT_MESSAGES
    - Organize authentication constants under auth.constants.ts

  CodeCleanliness:
    - Enforce zero dead code
    - Enforce zero unused imports
    - Enforce zero unused exports
    - Enforce zero duplicate functions
    - Enforce zero redundant constants
    - Maintain consistent naming conventions:
        variables: camelCase
        functions: camelCase
        types: PascalCase
        classes: PascalCase
        constants: UPPER_SNAKE_CASE
    - Lint and format with zero warnings (ESLint + Prettier compliance)

  Documentation:
    - Add JSDoc comments to all exported functions:
        include:
          - description
          - parameters
          - return type
          - usage example
    - Provide module-level documentation (purpose and dependencies)
    - Include migration guide in userManagement.ts
    - Provide usage examples in comments
    - Ensure clear parameter and return descriptions

  FirebaseOptimization:
    - Use a single callable function as the entry point
    - Implement switch-case routing for operations using switchCaseRouting utility
    - Use createRoutedFunction() helper for consistent callable function structure
    - Validate all request and response objects
    - Optimize imports to reduce cold start times
    - Prefer utils/switchCaseRouting.ts for all multi-action callable functions

  SwitchCaseRoutingPattern:
    - Use createRoutedFunction() for new callable functions
    - Define handlers as separate, testable functions
    - Specify auth requirements (requireAuth, requireAdmin)
    - Add custom validation with beforeRoute hook when needed
    - Follow ActionHandler<TRequest, TResponse> type signature
    - Keep handlers focused on single responsibility
    - See examples/switchCaseRoutingExamples.ts for reference patterns

  Summary:
    - Copilot must generate code that is:
        - Modular and structured
        - Fully type-safe
        - Clean and maintainable
        - Documented with JSDoc
        - Firebase-optimized
        - Uses reusable utilities (switchCaseRouting)
    - Goal: consistent, auditable, production-ready TypeScript codebase
