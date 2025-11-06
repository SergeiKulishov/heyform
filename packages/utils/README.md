# Utils

**Package**: `@heyform-inc/utils`

This package is a utility library that provides a collection of helper functions for various tasks. It is used by other packages in the monorepo to avoid code duplication and to have a consistent way of performing common operations.

## Features

- **Type Checking**: A comprehensive set of functions for checking the type of a variable (e.g., `isString`, `isObject`, `isArray`, `isNil`).
- **Date and Time**: A set of functions for working with dates and times, built on top of the `dayjs` library.
- **Object Manipulation**: A set of functions for working with objects, such as picking or excluding properties, and removing nil values.
- **String Manipulation**: Functions for working with strings, such as `slugify`.
- **Randomness**: Functions for generating random strings and numbers (`nanoid`, `uuid`).
- **Validation**: The `helper.ts` file re-exports and wraps some functions from the `validator` library, providing a consistent way to perform validation.
- **Other Utilities**: The package also includes utilities for working with colors, byte sizes, and more.

## Usage

The `utils` package is an essential part of the HeyForm application, as it provides a solid foundation of utility functions that are used throughout the codebase.
