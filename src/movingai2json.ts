import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export interface MovingAIMap {
    height: number;
    width: number;
    type: string;
    matrix: string[][];
}

export interface MovingAITask {
    bucket: number;
    map: string;
    mapWidth: number;
    mapHeight: number;
    startX: number;
    startY: number;
    goalX: number;
    goalY: number;
    optimalLength: number;
}

export type MovingAIScene = MovingAITask[];

function parseInteger(value: string, field: string, minimum: number): number {
    const parsed = Number(value);
    if (
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(parsed) ||
        parsed < minimum
    ) {
        throw new Error(`Invalid ${field}: expected an integer >= ${minimum}.`);
    }
    return parsed;
}

/**
 * Parse a string representing a map in the MovingAI format.
 * @param mapString The input string.
 * @returns The JSON object representation of the map.
 */
export function parseMapString(mapString: string): MovingAIMap {
    const lines = mapString.split(/\r?\n/);
    const marker = lines.findIndex((line) => line.trim() === "map");
    if (marker === -1) {
        throw new Error("Unable to parse the map. Missing map marker.");
    }
    const header = new Map<string, string>();
    for (let i = 0; i < marker; i++) {
        const fields = lines[i].trim().split(/\s+/);
        const [name, value] = fields;
        if (
            fields.length !== 2 ||
            !["type", "height", "width"].includes(name) ||
            header.has(name)
        ) {
            throw new Error(`Invalid map header at line ${i + 1}.`);
        }
        header.set(name, value);
    }
    const type = header.get("type");
    const heightValue = header.get("height");
    const widthValue = header.get("width");
    if (!type || heightValue === undefined || widthValue === undefined) {
        throw new Error("Unable to parse the map. Missing height/width/type.");
    }
    const height = parseInteger(heightValue, "map height", 1);
    const width = parseInteger(widthValue, "map width", 1);
    const rows = lines.slice(marker + 1);
    // Permit trailing newlines, but never trim tile rows or hide empty interior rows.
    while (rows.length > 0 && rows[rows.length - 1] === "") {
        rows.pop();
    }
    if (rows.length !== height) {
        throw new Error(
            `Invalid map: expected ${height} rows, got ${rows.length}.`,
        );
    }
    const matrix = rows.map((row, index) => {
        if (row.length !== width) {
            throw new Error(
                `Invalid map row ${index + 1}: expected ${width} tiles, got ${row.length}.`,
            );
        }
        return row.split("");
    });
    return { width, height, type, matrix };
}

/**
 * Parse a string representing scenario benchmark in the MovingAI format.
 * @param scenString The input string.
 * @returns The JSON representation of the input string scenario.
 */
export function parseScenString(scenString: string) {
    const scenarios = scenString.split("\n").slice(1); // Split and remove the header.

    const parseScenario = (scenarioString: string): MovingAITask => {
        const parsed = scenarioString.split("\t");
        return {
            bucket: parseInt(parsed[0], 10),
            map: parsed[1],
            mapWidth: parseInt(parsed[2], 10),
            mapHeight: parseInt(parsed[3], 10),
            startX: parseInt(parsed[4], 10),
            startY: parseInt(parsed[5], 10),
            goalX: parseInt(parsed[6], 10),
            goalY: parseInt(parsed[7], 10),
            optimalLength: parseFloat(parsed[8]),
        };
    };

    const scensJSON: MovingAIScene = [];
    for (const task of scenarios) {
        if (task.length < 5) {
            continue;
        } // Skip empty lines.
        scensJSON.push(parseScenario(task));
    }
    return scensJSON;
}

/******************************************************************************
 * FILE OPERATIONS
 *
 */

/**
 * Get a .map file and produce a file .map.json with the JSON representation of
 * the map.
 * @param filePath The input file path.
 */
export async function parseMapFile(filePath: string): Promise<void> {
    const data = await readFile(filePath, "utf8");
    const outJSON = parseMapString(data);
    await writeFile(`${filePath}.json`, JSON.stringify(outJSON));
}

/**
 * Get a .scen file and produce a file .scen.json with the JSON representation of the
 * scen file contents.
 * @param filePath The input file path.
 */
export async function parseScenFile(filePath: string): Promise<void> {
    const data = await readFile(filePath, "utf8");
    const outJSON = parseScenString(data);
    await writeFile(`${filePath}.json`, JSON.stringify(outJSON));
}

/**
 * Parse all the files in the given folder.
 * @param folder The input folder path.
 */
export async function parseAllInFolder(folder: string): Promise<void> {
    const entries = await readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
        if (!entry.isFile()) {
            continue;
        }
        const file = join(folder, entry.name);
        if (entry.name.endsWith(".map")) {
            await parseMapFile(file);
        } else if (entry.name.endsWith(".scen")) {
            await parseScenFile(file);
        }
    }
}

/******************************************************************************
 * COMMAND LINE INTERFACE
 *
 */

function printUsage(programName: string) {
    console.log("Usage:");
    console.log(
        `${programName} batch <folder> -- Convert all .map and .scen files in the folder.`,
    );
}

if (require.main === module) {
    const myArgs = process.argv.slice(2);

    if (myArgs.length !== 2 || myArgs[0] !== "batch") {
        printUsage(`${process.argv[0]} ${process.argv[1]}`);
        process.exitCode = 1;
    } else {
        parseAllInFolder(myArgs[1]).catch((error: unknown) => {
            console.error(error);
            process.exitCode = 1;
        });
    }
}
