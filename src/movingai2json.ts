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

/**
 * Parse a string representing a map in the MovingAI format.
 * @param mapString The input string.
 * @returns The JSON object representation of the map.
 */
export function parseMapString(mapString: string): MovingAIMap {
    // Parse a single command in the map header.
    const parseCommand = (commandString: string) => {
        const splitted = commandString.split(" ");
        return Object.freeze({ name: splitted[0], value: splitted[1] });
    };

    const jsonMap: Partial<MovingAIMap> = {};

    const themapSplitted = mapString.split("\n");
    let i = 0;
    let command = themapSplitted[i].trim();
    // Parse Header
    while (i < themapSplitted.length && !command.startsWith("map")) {
        if (command.startsWith("height")) {
            jsonMap.height = parseInt(parseCommand(command).value, 10);
        } else if (command.startsWith("width")) {
            jsonMap.width = parseInt(parseCommand(command).value, 10);
        } else if (command.startsWith("type")) {
            jsonMap.type = parseCommand(command).value;
        }
        command = themapSplitted[i].trim();
        i++;
    }

    if (!jsonMap.height || !jsonMap.width || !jsonMap.type) {
        throw new Error("Unable to parse the map. Missing height/width/type.");
    }

    // Parse Map
    jsonMap.matrix = new Array(jsonMap.height);
    for (let r = 0; r < jsonMap.height; r++) {
        jsonMap.matrix[r] = new Array(jsonMap.width);
        for (let c = 0; c < jsonMap.width; c++) {
            jsonMap.matrix[r][c] = themapSplitted[r + i][c];
        }
    }

    return {
        width: jsonMap.width,
        height: jsonMap.height,
        type: jsonMap.type,
        matrix: jsonMap.matrix,
    };
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
            optimalLength: parseInt(parsed[8], 10),
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
