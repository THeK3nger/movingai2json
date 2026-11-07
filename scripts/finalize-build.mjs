import { writeFile } from "node:fs/promises";

// Scope both the JavaScript and declaration files to ESM without changing CJS consumers.
await writeFile(
    new URL("../dist/esm/package.json", import.meta.url),
    `${JSON.stringify({ type: "module" }, null, 4)}\n`,
);
