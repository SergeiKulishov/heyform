# HeyForm Architecture

HeyForm is a monorepo with a client-server architecture. It is built with TypeScript and uses `pnpm` as a package manager.

## Overall Architecture

The application is divided into several packages, each with a specific responsibility. This modular architecture makes the application scalable and maintainable.

- **Backend**: The `server` package is a `NestJS` application that provides a `GraphQL` API. It handles all the business logic, data storage, and authentication. It uses `MongoDB` as its database.
- **Frontend**: The `webapp` package is a `React` single-page application (SPA) that consumes the `GraphQL` API from the server. It's responsible for the user interface and user experience.
- **Shared Code**: The `shared-types-enums` and `utils` packages contain code that is shared between the frontend and backend. This helps to reduce code duplication and ensure consistency.
- **Form Rendering**: The `form-renderer` package is a dedicated library for rendering the forms themselves. This makes it reusable and easy to maintain.
- **Answer Handling**: The `answer-utils` package provides a set of utilities for processing and validating form answers.
- **Embedding**: The `embed` package allows users to embed forms on their own websites.

## Packages

### `server`

The backend of the application, built with `NestJS`.

- **Framework**: `NestJS`
- **API**: `GraphQL`
- **Database**: `MongoDB` (using `mongoose`)
- **Background Jobs**: `bull`
- **Authentication**: `jsonwebtoken`
- **Testing**: `jest`

### `webapp`

The frontend of the application, built with `React`.

- **Framework**: `React`
- **Build Tool**: `Vite`
- **State Management**: `mobx-react-lite` and `zustand`
- **Routing**: `react-router-dom`
- **API Client**: `@apollo/client`
- **Styling**: `tailwindcss`
- **Internationalization**: `i18next`

### `form-renderer`

A React library for rendering forms.

- **Framework**: `React`
- **Bundler**: `tsup`
- **Styling**: `tailwindcss`
- **Internationalization**: `i18next`

### `answer-utils`

A utility library for handling form answers.

- **Testing**: `vitest`
- **Dependencies**: `@heyform-inc/shared-types-enums`, `@heyform-inc/utils`, `big.js`, `dayjs`, `html5parser`, `libphonenumber-js`, `validator`.

### `embed`

A JavaScript library for embedding forms into other websites.

- **Bundler**: `rollup`

### `shared-types-enums`

A package that contains shared TypeScript types and enums used by both the `server` and `webapp`.

- **Bundler**: `tsup`

### `utils`

A utility library with common functions used by other packages.

- **Testing**: `vitest`
