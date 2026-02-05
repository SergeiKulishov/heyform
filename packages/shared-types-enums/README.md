# Shared Types and Enums

**Package**: `@voxly/shared-types-enums`

This package contains shared TypeScript types and enums that are used by both the `server` and `webapp` packages. This helps to keep the data structures consistent between the frontend and backend, reducing the risk of errors and making the code more maintainable.

## Key Contents

- **`form.ts`**: Defines the core data structures for forms, including interfaces for form settings, fields, themes, logic, and variables.
- **`submission.ts`**: Defines the data structures for form submissions, including interfaces for answers and the main submission model.
- **`enums`**: A directory containing a comprehensive set of enums used throughout the application. These enums define things like field kinds, form statuses, logic actions, and comparison operators.

## Importance

This package is a critical part of the application's architecture. By providing a single source of truth for the data structures, it ensures that the frontend and backend are always in sync. This makes it easier to develop new features and reduces the likelihood of bugs caused by data inconsistencies.
