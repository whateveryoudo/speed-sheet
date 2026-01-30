# speed-sheet

A sheet editor based on lucksheet, reference tiptap architecture.

## Architecture

This project follows a monorepo structure similar to [tiptap](https://github.com/ueberdosis/tiptap):

- **@speed-sheet/core**: Core sheet editor logic without UI dependencies
- **@speed-sheet/react**: React renderer for speed-sheet
- **@speed-sheet/vue3**: Vue3 renderer for speed-sheet

## Installation

```bash
pnpm install
```

## Development

```bash
# Build all packages
pnpm build

# Type check all packages
pnpm type-check

# Watch mode for development
pnpm dev
```

## Packages

### @speed-sheet/core

The core package contains the business logic for the sheet editor without any UI dependencies.

```typescript
import { SheetEditor } from '@speed-sheet/core';

const editor = new SheetEditor();
editor.setCellValue(0, 0, 'Hello');
const value = editor.getCellValue(0, 0);
```

### @speed-sheet/react

React renderer for speed-sheet.

```tsx
import { SpeedSheet } from '@speed-sheet/react';

function App() {
  return <SpeedSheet onChange={(workbook) => console.log(workbook)} />;
}
```

### @speed-sheet/vue3

Vue3 renderer for speed-sheet.

```vue
<script setup>
import { SpeedSheet } from '@speed-sheet/vue3';

function handleChange(workbook) {
  console.log(workbook);
}
</script>

<template>
  <SpeedSheet @onChange="handleChange" />
</template>
```

## License

MIT
