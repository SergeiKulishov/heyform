# HeyForm Backend Architecture

This document provides a deep dive into the backend architecture of the HeyForm application, which is located in the `packages/server` directory.

## Overview

The backend is a `NestJS` application written in TypeScript. It serves a `GraphQL` API and uses `MongoDB` as its database. It follows a modular architecture, with each feature encapsulated in its own module.

## Directory Structure

The `src` directory of the `server` package is organized as follows:

- `apps`: Contains different applications or modules within the server.
- `common`: Contains common utilities, constants, and decorators.
- `config`: Handles application configuration.
- `controller`: Contains REST API controllers.
- `environments`: Configuration for different environments.
- `model`: Contains the Mongoose schemas (data models).
- `queue`: Contains the Bull queue processors for background jobs.
- `resolver`: Contains the GraphQL resolvers.
- `schedule`: Contains scheduled tasks (cron jobs).
- `service`: Contains the business logic.
- `utils`: Utility functions specific to the server.

## Data Models

The data models are defined using `Mongoose` schemas in the `model` directory. The core models are:

- **`User`**: Represents a user of the application.
- **`Team`**: Represents a team of users.
- **`Project`**: Represents a project within a team, which is a container for forms.
- **`Form`**: Represents a form with its fields, logic, settings, and theme.
- **`Submission`**: Represents a single submission of a form.

## GraphQL API

The API is exposed through `GraphQL`. The resolvers are located in the `resolver` directory and are organized by feature. The resolvers use services to fetch and manipulate data.

- **Authentication**: All resolvers are protected by an `@Auth()` decorator, which enforces authentication.
- **Authorization**: The resolvers use guards like `@TeamGuard()`, `@ProjectGuard()`, and `@FormGuard()` to control access to resources based on user permissions.

## Services

The business logic is encapsulated in services, which are located in the `service` directory. The services are responsible for interacting with the data models and performing CRUD operations.

- **`TeamService`**: Manages teams, team members, and invitations.
- **`ProjectService`**: Manages projects and project members.
- **`FormService`**: Manages forms, including creation, updates, and field management.
- **`SubmissionService`**: Manages form submissions.

## Authentication and Authorization

- **Authentication**: The `@Auth()` decorator applies the `AuthGuard`, which validates the user's JWT token.
- **Authorization**: The `PermissionGuard` is used to control access to resources based on the user's role and permissions. The `@TeamGuard()`, `@ProjectGuard()`, and `@FormGuard()` decorators set the required permission scope for the `PermissionGuard`.

## Background Jobs

The application uses `Bull` to manage background jobs. The queue processors are located in the `queue` directory.

- **`SubmissionNotificationQueue`**: Sends an email notification when a new submission is received.
- **`TranslateFormQueue`**: Translates form fields into different languages using the OpenAI API.

## Configuration

The application's configuration is located in the `config` directory. It uses environment variables to store sensitive information.

- **`mongo/index.ts`**: Configures the Mongoose connection.
- **`graphql/index.ts`**: Configures the GraphQL module, including error formatting and CORS.

## Error Handling

The GraphQL module has a custom error formatter that standardizes the error response. It extracts the relevant information from the error and returns a consistent error object to the client.
