import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import {
    parseAllInFolder,
    parseMapFile,
    parseMapString,
    parseScenFile,
    parseScenString,
} from "../dist/movingai2json.js";

const execFileAsync = promisify(execFile);
const mapFixture = resolve("test/keydoor.map");
const scenFixture = resolve("test/arena.map.scen");

test("parseMapString parses map dimensions and tiles", async () => {
    const map = parseMapString(await readFile(mapFixture, "utf8"));
    assert.equal(map.width, 20);
    assert.equal(map.height, 21);
    assert.equal(map.matrix.length, 21);
    assert.ok(map.matrix.every((row) => row.length === 20));
});

test("parseMapString rejects a missing header", () => {
    assert.throws(
        () => parseMapString("map\n.."),
        /Missing height\/width\/type/,
    );
});

test("map headers accept flexible whitespace and CRLF without shifting rows", () => {
    assert.deepEqual(
        parseMapString(
            "width\t2\r\n type   octile \r\nheight  2\r\nmap\r\n.@\r\nT.\r\n\r\n",
        ),
        {
            width: 2,
            height: 2,
            type: "octile",
            matrix: [
                [".", "@"],
                ["T", "."],
            ],
        },
    );
    assert.deepEqual(
        parseMapString("type octile\nheight 1\nwidth 1\nmap\n.").matrix,
        [["."]],
    );
});

test("map validation rejects malformed headers and tile rows", () => {
    const header = "type octile\nheight 2\nwidth 2\n";
    const cases: [string, RegExp][] = [
        ["", /Missing map marker/],
        [header, /Missing map marker/],
        [`${header}maple\n..\n..`, /Missing map marker/],
        [`${header}width 2\nmap\n..\n..`, /Invalid map header/],
        [`${header}unknown value\nmap\n..\n..`, /Invalid map header/],
        ["type\nheight 1\nwidth 1\nmap\n.", /Invalid map header/],
        [`${header}map\n..`, /expected 2 rows/],
        [`${header}map\n..\n..\n..`, /expected 2 rows/],
        [`${header}map\n.\n..`, /row 1.*expected 2 tiles/],
        [`${header}map\n...\n..`, /row 1.*expected 2 tiles/],
        [`${header}map\n\n..`, /row 1.*expected 2 tiles/],
    ];
    for (const value of [
        "0",
        "-1",
        "1.5",
        "2oops",
        "NaN",
        "Infinity",
        "9007199254740992",
    ]) {
        cases.push([
            `type octile\nheight ${value}\nwidth 2\nmap\n..`,
            /Invalid map height/,
        ]);
        cases.push([
            `type octile\nheight 1\nwidth ${value}\nmap\n..`,
            /Invalid map width/,
        ]);
    }
    for (const [input, expected] of cases) {
        assert.throws(
            () => parseMapString(input),
            expected,
            JSON.stringify(input),
        );
    }
});

test("parseScenString parses scenario coordinates", async () => {
    const scenarios = parseScenString(await readFile(scenFixture, "utf8"));
    assert.ok(scenarios.length > 5);
    assert.ok(
        scenarios.every((scenario) => scenario.map === "maps/dao/arena.map"),
    );
    assert.equal(scenarios[5].startX, 1);
    assert.equal(scenarios[2].optimalLength, 3.41421);
});

test("scenarios preserve fractional lengths and support CRLF and blank lines", () => {
    const tasks = parseScenString(
        "version\t1.0\r\n\r\n0\tmap with spaces.map\t2\t2\t0\t0\t1\t1\t1.41421356\r\n \t \r\n",
    );
    assert.equal(tasks.length, 1);
    // biome-ignore lint/suspicious/noApproximativeNumericConstant: Preserve the exact decimal in the scenario, not Math.SQRT2.
    assert.equal(tasks[0].optimalLength, 1.41421356);
    assert.equal(tasks[0].map, "map with spaces.map");
    assert.deepEqual(parseScenString("version 1\n"), []);
    assert.equal(
        parseScenString("version 1\n0\ta.map\t1\t1\t0\t0\t0\t0\t0")[0]
            .optimalLength,
        0,
    );
});

test("scenario validation rejects bad headers, fields, numbers, and coordinates", () => {
    for (const header of ["", "version 2", "version 1oops", "not a header"]) {
        assert.throws(() => parseScenString(header), /Invalid scenario header/);
    }
    const valid = ["0", "a.map", "2", "2", "0", "0", "1", "1", "1.41421"];
    for (const line of [
        "bad",
        valid.slice(1).join("\t"),
        `${valid.join("\t")}\textra`,
        valid.join(" "),
    ]) {
        assert.throws(
            () => parseScenString(`version 1\n${line}`),
            /line 2.*9 nonempty tab-separated fields/,
        );
    }
    const cases: [number, string][] = valid.map((_, index) => [index, ""]);
    for (const index of [0, 2, 3, 4, 5, 6, 7]) {
        for (const value of [
            "-1",
            "1.5",
            "1oops",
            "NaN",
            "Infinity",
            "9007199254740992",
        ]) {
            cases.push([index, value]);
        }
    }
    cases.push([2, "0"], [3, "0"], [4, "2"], [5, "2"], [6, "2"], [7, "2"]);
    for (const value of [
        "-0.1",
        "NaN",
        "Infinity",
        "1e999",
        "1.5oops",
        "0x10",
    ]) {
        cases.push([8, value]);
    }
    for (const [index, value] of cases) {
        const fields = [...valid];
        fields[index] = value;
        assert.throws(
            () => parseScenString(`version 1\n${fields.join("\t")}`),
            /scenario line 2/,
        );
    }
});

test("invalid file contents reject without writing JSON", async (t) => {
    const folder = await mkdtemp(join(tmpdir(), "movingai2json-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const map = join(folder, "invalid.map");
    const scen = join(folder, "invalid.scen");
    await writeFile(map, "type octile\nheight 1\nwidth 2\nmap\n.");
    await writeFile(scen, "version 1\nmalformed");
    await assert.rejects(parseMapFile(map), /expected 2 tiles/);
    await assert.rejects(parseScenFile(scen), /scenario line 2/);
    await assert.rejects(readFile(`${map}.json`), { code: "ENOENT" });
    await assert.rejects(readFile(`${scen}.json`), { code: "ENOENT" });
});

test("file parsers write complete JSON files", async (t) => {
    const folder = await mkdtemp(join(tmpdir(), "movingai2json-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const map = join(folder, "example.map");
    const scen = join(folder, "example.scen");
    await copyFile(mapFixture, map);
    await copyFile(scenFixture, scen);
    await parseMapFile(map);
    await parseScenFile(scen);
    assert.deepEqual(
        JSON.parse(await readFile(`${map}.json`, "utf8")),
        parseMapString(await readFile(map, "utf8")),
    );
    assert.deepEqual(
        JSON.parse(await readFile(`${scen}.json`, "utf8")),
        parseScenString(await readFile(scen, "utf8")),
    );
});

test("batch conversion awaits writes and skips directories and unrelated files", async (t) => {
    const folder = await mkdtemp(join(tmpdir(), "movingai2json-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    await copyFile(mapFixture, join(folder, "example.map"));
    await copyFile(scenFixture, join(folder, "example.scen"));
    await mkdir(join(folder, "directory.map"));
    await writeFile(join(folder, "ignore.txt"), "not a map");
    await parseAllInFolder(folder);
    assert.equal(
        JSON.parse(await readFile(join(folder, "example.map.json"), "utf8"))
            .width,
        20,
    );
    assert.ok(
        JSON.parse(await readFile(join(folder, "example.scen.json"), "utf8"))
            .length > 0,
    );
    await assert.rejects(readFile(join(folder, "ignore.txt.json")), {
        code: "ENOENT",
    });
});

test("filesystem errors preserve their error codes", async (t) => {
    const folder = await mkdtemp(join(tmpdir(), "movingai2json-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    await assert.rejects(parseMapFile(join(folder, "missing.map")), {
        code: "ENOENT",
    });
    await assert.rejects(parseScenFile(join(folder, "missing.scen")), {
        code: "ENOENT",
    });
    await assert.rejects(parseAllInFolder(join(folder, "missing")), {
        code: "ENOENT",
    });
});

test("CLI converts a folder and reports invalid invocations", async (t) => {
    const folder = await mkdtemp(join(tmpdir(), "movingai2json-"));
    t.after(() => rm(folder, { recursive: true, force: true }));
    const cli = resolve("dist/movingai2json.js");
    await copyFile(mapFixture, join(folder, "example.map"));
    await execFileAsync(process.execPath, [cli, "batch", folder]);
    assert.equal(
        JSON.parse(await readFile(join(folder, "example.map.json"), "utf8"))
            .width,
        20,
    );
    await assert.rejects(execFileAsync(process.execPath, [cli]));
    await assert.rejects(
        execFileAsync(process.execPath, [cli, "unknown", folder]),
    );
    await assert.rejects(
        execFileAsync(process.execPath, [
            cli,
            "batch",
            join(folder, "missing"),
        ]),
    );
});
