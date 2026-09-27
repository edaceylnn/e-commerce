import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "node:util";

// jsdom (Jest's default test environment) doesn't provide these Web APIs,
// but jose (JWT signing, used by src/lib/auth.ts) and pg need them.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  // @ts-expect-error -- Node's TextDecoder type is close enough for tests
  globalThis.TextDecoder = TextDecoder;
}
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (value: unknown) =>
    JSON.parse(JSON.stringify(value));
}
