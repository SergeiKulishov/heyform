# Embed

**Package**: `@heyform-inc/embed`

This package is a JavaScript library for embedding HeyForm forms into other websites. It is built with TypeScript and bundled with `Rollup`.

## Features

- **Multiple Embed Modes**: Supports several embedding modes, including:
    - `standard`: Embeds the form directly into the page.
    - `full-page`: Embeds the form as a full-page iframe.
    - `modal`: Displays the form in a modal window.
    - `popup`: Displays the form in a popup.
- **Easy Configuration**: The library is configured using `data-heyform-*` attributes on a container element, making it easy to set up.
- **Programmatic Control**: Provides a global `HeyForm` object with functions to programmatically open, close, and toggle embeds.
- **Trigger Events**: The `modal` and `popup` embeds can be triggered by various events, such as page load, a time delay, exit intent, or scroll position.

## Usage

To use the embed library, you need to include the script in your HTML file and then add a container element with the appropriate `data-heyform-*` attributes.

```html
<div
  data-heyform-id="<your-form-id>"
  data-heyform-type="modal"
  data-heyform-settings='{"openTrigger": "delay", "openDelay": 2000}'
></div>

<script src="https://cdn.heyform.net/embed.js"></script>
```

This will create a modal embed that opens after a 2-second delay.
