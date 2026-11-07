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
    assert.equal(map.height, 20);
    assert.equal(map.matrix.length, 20);
    assert.ok(map.matrix.every((row) => row.length === 20));
});

test("parseMapString rejects a missing header", () => {
    assert.throws(
        () => parseMapString("map\n.."),
        /Missing height\/width\/type/,
    );
});

test("parseScenString parses scenario coordinates", async () => {
    const scenarios = parseScenString(await readFile(scenFixture, "utf8"));
    assert.ok(scenarios.length > 5);
    assert.ok(
        scenarios.every((scenario) => scenario.map === "maps/dao/arena.map"),
    );
    assert.equal(scenarios[5].startX, 1);
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
