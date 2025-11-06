# Webapp

**Package**: `heyform-webapp`

This is the frontend of the HeyForm application. It is a single-page application (SPA) built with `React` and `Vite`.

## Features

- **Modern Tech Stack**: Built with `React` and `Vite`, ensuring a fast and modern user experience.
- **Routing**: Uses `react-router-dom` for routing, with a well-structured routing configuration.
- **State Management**: Uses `Zustand` for state management, providing a simple and powerful way to manage the application's state.
- **GraphQL Client**: Uses `@apollo/client` to communicate with the backend GraphQL API.
- **Component-Based Architecture**: Built with a component-based architecture, with reusable components that make the code more maintainable.
- **Styling**: Uses `Tailwind CSS` for styling, allowing for rapid UI development.
- **Internationalization**: Uses `i18next` to support multiple languages.
- **Form Rendering**: Uses the `@heyform-inc/form-renderer` package to render the forms.

## Core Components

- **`main.tsx`**: The entry point of the application. It sets up the router, error boundaries, and other global providers.
- **`routes/index.tsx`**: The main routing configuration file. It defines the routes for all the pages in the application.
- **`pages`**: This directory contains the main pages of the application, such as the form builder, the dashboard, and the settings pages.
- **`store`**: This directory contains the `Zustand` stores for managing the application's state.
- **`services`**: This directory contains services for communicating with the backend API.

## Usage

The `webapp` is the main interface for the users of HeyForm. It allows them to create, manage, and share forms, as well as view and analyze the submissions.
