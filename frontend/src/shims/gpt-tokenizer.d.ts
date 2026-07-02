// Minimal typing shim for gpt-tokenizer.
//
// The package's shipped .d.ts uses string-literal export aliases (a TS 5.6+
// feature) that this project's TypeScript (5.5) cannot parse. We only use
// `encode`, so we map the module's types here via tsconfig "paths". The real
// package is still bundled and executed at runtime — Vite ignores tsconfig
// paths, so `await import('gpt-tokenizer')` loads the actual implementation.

export function encode(text: string): number[];
