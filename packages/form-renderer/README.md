# Form Renderer

**Package**: `@heyform-inc/form-renderer`

This package is a React library responsible for rendering the forms. It is built with TypeScript and Vite, and uses `tsup` to create a distributable package.

## Features

- **Dynamic Rendering**: Dynamically renders form fields based on the form's definition.
- **Conditional Logic**: Uses the `answer-utils` package to apply conditional logic, showing or hiding fields based on the user's answers.
- **State Management**: Uses `useReducer` and `useContext` to manage the form's state, including the current values, the visible fields, and the submission status.
- **Theming**: Supports theming, allowing the form's appearance to be customized.
- **Stripe Integration**: Has built-in support for Stripe, allowing for payments to be collected directly within the form.
- **Auto-saving**: Can automatically save the user's progress to local storage.
- **Internationalization**: Uses `i18next` to support multiple languages.

## Core Components

- **`FormRenderer`**: The main component that orchestrates the rendering of the form. It initializes the store, handles Stripe integration, and renders the main layout.
- **`Blocks`**: This component renders the individual form fields.
- **`Sidebar`**: This component displays a list of the form's questions, allowing the user to navigate between them.
- **`Store`**: The `store.ts` file defines the form's state and the reducer function that updates it. It also includes functions for interacting with local storage.

## Usage

The `form-renderer` is used by the `webapp` to display the forms to the end-users. It is a powerful and flexible library that provides a great user experience for filling out forms.
