# Answer Utils

**Package**: `@heyform-inc/answer-utils`

This package provides a set of utility functions for working with form answers. It is used by both the `server` and `webapp` packages to handle answer parsing, validation, and logic.

## Features

- **Answer Parsing and Formatting**: Convert answers to different formats like HTML, JSON, and plain text.
- **Validation**: A robust validation engine to validate answers based on the field type and validation rules.
- **Conditional Logic**: Apply conditional logic to form fields, allowing for dynamic forms that change based on user input.
- **Transformation**: A set of functions to transform data between different formats.

## Main Functions

- **`answer-to-html`**: Converts an array of answers into an HTML string.
- **`validate`**: Validates a single answer based on a set of rules.
- **`applyLogicToFields`**: Applies conditional logic to a set of fields.
- **`field-values-to-answer`**: Converts a map of field values into an array of answers.

## Usage

This package is used extensively throughout the application to handle form submissions. For example, the `server` uses it to validate submissions before saving them to the database, and the `webapp` uses it to apply conditional logic to the form as the user is filling it out.
