# @soul_master/ts-config

Shared strict TypeScript configs for Node.js, Vite web apps, and libraries.

The default supported ECMAScript version is ES2024, and the default Node.js target is [Node.js v24 LTS](https://nodejs.org/). For more information about ECMAScript runtime compatibility, see [Soul-Master/ecma-compat-table](https://github.com/Soul-Master/ecma-compat-table).

## Install

```sh
npm install --save-dev typescript @soul_master/ts-config
```

## Usage

Create a `tsconfig.json` in your project and extend one of the exported configs.

```json
{
  "extends": "@soul_master/ts-config/node.json",
  "include": ["src/**/*.ts"]
}
```

## Configs

### Base

Use the base config when you want only the shared strict defaults.

```json
{
  "extends": "@soul_master/ts-config/base.json"
}
```

The base config enables `erasableSyntaxOnly` so TypeScript rejects syntax that Node.js native type stripping cannot erase safely. It also enables `resolveJsonModule` so JSON imports get inferred TypeScript types during type checking.

### Node.js 24

Use `node.json` for Node.js 24 projects that run TypeScript with Node's native type stripping.

```json
{
  "extends": "@soul_master/ts-config/node.json",
  "include": ["src/**/*.ts"]
}
```

This config uses Node's ESM/CJS-aware module behavior and Node types.

For JSON imports in Node.js ESM, keep the runtime import attribute and let `resolveJsonModule` provide the type:

```ts
import data from "./data.json" with { type: "json" };
```

### Node.js 20

Use `node20.json` when the project targets Node.js 20 specifically.

```json
{
  "extends": "@soul_master/ts-config/node20.json",
  "include": ["src/**/*.ts"]
}
```

### Node.js Library

Use `node-lib.json` for Node.js packages that should emit declaration files.

```json
{
  "extends": "@soul_master/ts-config/node-lib.json",
  "include": ["src/**/*.ts"]
}
```

This config extends the Node.js 24 config and enables declaration-only output.

### Web App

Use `web.json` for web apps without adding framework-specific types.

```json
{
  "extends": "@soul_master/ts-config/web.json",
  "include": ["src/**/*.ts", "src/**/*.tsx", "vite-env.d.ts"]
}
```

The shared web config includes browser libs and Vite-friendly bundler module resolution, but it does not include React, Vue, Svelte, or `vite/client` types.

For Vite's `import.meta.env` and asset import types, add a local `vite-env.d.ts` file in your app:

```ts
/// <reference types="vite/client" />
```

### Web Library

Use `web-lib.json` for browser libraries that should emit declaration files.

```json
{
  "extends": "@soul_master/ts-config/web-lib.json",
  "include": ["src/**/*.ts"]
}
```

This config extends the web config and enables declaration-only output.

### Web Worker

Use `worker.json` for Web Workers, Service Workers, and other worker contexts.

```json
{
  "extends": "@soul-master/ts-config/worker.json",
  "include": ["src/**/*.ts"]
}
```

This config includes Web Worker APIs and Vite-friendly bundler module resolution without exposing browser DOM globals such as `document` and `window`.

## Notes

Library configs disable `allowImportingTsExtensions` because they emit declarations. Runtime-focused configs keep `noEmit` enabled by default.
