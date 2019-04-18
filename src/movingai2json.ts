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
 * @returns {{}} The JSON object representation of the map.
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
 * @returns {Array} The JSON representation of the input string scenario.
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

import fs from "fs-extra";

/**
 * Get a .map file and produce a file .map.json with the JSON representation of
 * the map.
 * @param filePath The input file path.
 * @param onComplete Callback executed when the output file is written.
 */
export async function parseMapFile(filePath: string): Promise<void> {
    try {
        const data = await fs.readFile(filePath);
        const outJSON = parseMapString(data.toString());
        await fs.writeFile(filePath + ".json", JSON.stringify(outJSON));
    } catch (err) {
        throw new Error(err);
    }
}

/**
 * Get a .scen file and produce a file .scen.json with the JSON representation of the
 * scen file contents.
 * @param filePath The input file path.
 * @param onComplete Callback executed when the output file is written.
 */
export async function parseScenFile(filePath: string): Promise<void> {
    try {
        const data = await fs.readFile(filePath);
        const outJSON = parseScenString(data.toString());
        await fs.writeFile(filePath + ".json", JSON.stringify(outJSON));
    } catch (err) {
        throw new Error(err);
    }
}

/**
 * Parse all the files in the given folder.
 * @param folder The input folder path.
 * @param onComplete A callback executed when all the files are processed.
 */
export async function parseAllInFolder(folder: string): Promise<void> {
    const parseFile = async (file: string) => {
        if (file.substr(-4) === ".map") {
            parseMapFile(file);
        } else if (file.substr(-5) === ".scen") {
            parseScenFile(file);
        }
    };

    try {
        let files = await fs.readdir(folder);
        files = files.filter(
            (file) => file.substr(-4) === ".map" || file.substr(-5) === ".scen",
        );
        const promiseParseMap = files.map((x) => parseFile(folder + "/" + x));
        await Promise.all(promiseParseMap);
    } catch (err) {
        throw new Error(err);
    }
}

/******************************************************************************
 * COMMAND LINE INTERFACE
 *
 */

function printUsage(programName: string) {
    // tslint:disable-next-line:no-console
    console.log("Usage:");
    // tslint:disable-next-line:no-console
    console.log(
        `${programName} batch [folder] -- Convert all the .map file in the folder path.`,
    );
}

if (module.parent === undefined || module.parent === null) {
    const myArgs = process.argv.slice(2);

    if (myArgs.length < 2) {
        printUsage(process.argv[0] + " " + process.argv[1]);
    } else {
        if (myArgs[0] === "batch") {
            // tslint:disable-next-line:no-console
            console.log("Run batch conversion");
            parseAllInFolder(myArgs[1]);
        }
    }
}
