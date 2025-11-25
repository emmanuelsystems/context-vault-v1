# Context Vault Widget

A minimal React + TypeScript widget for embedding Context Vault functionality.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Widget Integration

The widget can be embedded in any web page:

```html
<!-- Include React (if not already present) -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

<!-- Include the widget -->
<script src="./dist/context-vault-widget.umd.js"></script>

<!-- Mount point -->
<div id="context-vault-root"></div>

<script>
  // Initialize widget
  ContextVaultWidget.mount('#context-vault-root');
</script>
```

## Build Output

- `dist/context-vault-widget.es.js` - ES module format
- `dist/context-vault-widget.umd.js` - UMD format for browser
