# movingai2json

[![CI](https://github.com/THeK3nger/movingai2json/actions/workflows/ci.yml/badge.svg)](https://github.com/THeK3nger/movingai2json/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/movingai2json.svg)](https://www.npmjs.com/package/movingai2json)

Convert [Moving AI](https://movingai.com/) benchmark `.map` and `.scen` files into
JSON. Requires Node.js 22.12 or newer. No runtime dependencies.

## Library

```sh
npm install movingai2json
```

```js
const { parseMapString, parseScenString } = require("movingai2json");

const map = parseMapString("type octile\nheight 2\nwidth 2\nmap\n..\n.@\n");
// { width: 2, height: 2, type: "octile", matrix: [[".", "."], [".", "@"]] }

const tasks = parseScenString(
    "version 1\n0\texample.map\t2\t2\t0\t0\t1\t1\t1\n",
);
// [{ bucket: 0, map: "example.map", mapWidth: 2, mapHeight: 2,
//    startX: 0, startY: 0, goalX: 1, goalY: 1, optimalLength: 1 }]
```

TypeScript declarations are included. The package retains CommonJS compatibility.

`parseMapFile(path)` and `parseScenFile(path)` write JSON to `<path>.json`.
`parseAllInFolder(folder)` converts `.map` and `.scen` files directly in a folder,
skipping subdirectories. All file operations return promises; await them to handle
completion and errors.

## CLI (from a checkout)

```sh
npm ci
npm run build
npm start -- batch /path/to/maps
```

Invalid arguments and conversion failures exit with a nonzero status.

## Development

Use a supported Node.js LTS release (22 or 24). CI also checks Node.js 26 on Linux
and Windows.

```sh
npm ci
npm run check   # Biome lint, import ordering, and formatting checks
npm run format # Apply formatting
npm test       # Build, type-check tests, and run Node's test runner with coverage
npm pack --dry-run # Verify the publication contents; rebuilds automatically
```

Tests use temporary directories and clean up their generated files. Only `dist/`,
the README, license, and package metadata are published. GitHub Actions checks
every pull request; Dependabot proposes weekly dependency and action updates.

## License

[MIT](LICENSE)
