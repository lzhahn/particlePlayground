# Particle Playground

A foundational TypeScript application built with Vite and esbuild.

## Project Structure

```
particlePlayground/
├── src/
│   ├── main.ts          # Entry point
│   ├── app.ts           # Main application class
│   └── styles/
│       └── main.css     # Global styles
├── index.html           # HTML entry point
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Vite configuration
└── README.md
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

4. Preview production build:
   ```bash
   npm run preview
   ```

## Tech Stack

- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server
- **esbuild** - Ultra-fast JavaScript bundler (used by Vite)

## Development Notes

### Pre-commit Hook (Husky)

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. A pre-commit hook automatically runs `npm run build` before each commit to ensure:
- All TypeScript code compiles without errors
- The build process completes successfully
- No broken code is committed to the repository

The hook is automatically installed when you run `npm install` (via the `prepare` script). If the build fails, the commit will be aborted.

Hook configuration is located in `.husky/pre-commit` and is tracked in the repository, ensuring all team members use the same hooks.
