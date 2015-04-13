// Polyfill for startsWith.
if (!String.prototype.startsWith) {
    Object.defineProperty(String.prototype, 'startsWith', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: function(searchString, position) {
            position = position || 0;
            return this.lastIndexOf(searchString, position) === position;
        }
    });
}

function parseMapString (map_string) {
    var parseCommand = (command_string) => {
        var splitted = command_string.split(" ");
        return Object.freeze({name: splitted[0], value: splitted[1]});
    };

    var json_map = {};

    var themap_splitted = map_string.split("\n");
    var i = 0;
    var command = themap_splitted[i].trim();
    // Parse Header
    while (i < themap_splitted.length && !command.startsWith("map")) {
        if (command.startsWith("height")) {
            json_map.height = parseInt(parseCommand(command).value, 10);
        } else if (command.startsWith("width")) {
            json_map.width = parseInt(parseCommand(command).value, 10);
        } else if (command.startsWith("type")) {
            json_map.type = parseCommand(command).value;
        }
        command = themap_splitted[i].trim();
        i++;
    }

    // Parse Map
    json_map.matrix = new Array(json_map.height);
    for (var r=0;r<json_map.height;r++) {
        json_map.matrix[r] = new Array(json_map.width);
        for (var c=0;c<json_map.width;c++) {
            json_map.matrix[r][c] = themap_splitted[r+i][c];
        }
    }
    return json_map;
}

function parseScenString(scenString) {
    let scenarios = scenString.split("\n").slice(1); // Split and remove the header.

    let parseScenario = (scenarioString) => {
        const parsed = scenarioString.split('\t');
        return {
            bucket: parsed[0],
            map: parsed[1],
            mapWidth: parsed[2],
            mapHeight: parsed[3],
            startX: parsed[4],
            startY: parsed[5],
            goalX: parsed[6],
            goalY: parsed[7],
            optimalLength: parsed[8]
        };
    };

    var scensJSON = [];
    for (let i=0; i<scenarios.length; i++) {
        if (scenarios[i].length < 5) { continue; }// Skip empty lines.
        scensJSON.push(parseScenario(scenarios[i]));
    }
    return scensJSON;
}

/******************************************************************************
 * FILE OPERATIONS
 *
 */

var fs = require('fs');
var async = require('async');

/**
 * Get a .map file and produce a file .map.json with the JSON representation of
 * the map.
 * @param filePath The input file path.
 * @param onComplete Callback executed when the output file is written.
 */
function parseMapFile(filePath, onComplete = () => {}) {
    fs.readFile( filePath, (err, data) => {
        if (err) {
            throw err;
        }
        const outJSON = parseMapString(data.toString());
        fs.writeFile(filePath + ".json", JSON.stringify(outJSON), (err) => {
            if (err) {
                return console.log(err);
            }
            onComplete();
        });
    });
}

function parseAllInFolder(folder, onComplete = () => {}) {
    // TODO: Suppress the STDOUT output on request.
    fs.readdir(folder, (err, files) =>  {
        files = files.filter( (file) => file.substr(-4) === ".map");
        console.log(`${files.length} files found!`);
        async.each(files, (file, callback) => parseMapFile(folder + "/" + file, callback), (err) => {
            if (err) {
                throw err;
            }
            console.log("Completed!");
            onComplete();
        });
    });
}

exports.parseMapString = parseMapString;
exports.parseScenString = parseScenString;
exports.parseMapFile = parseMapFile;
exports.parseAllInFolder = parseAllInFolder;

/******************************************************************************
 * COMMAND LINE INTERFACE
 *
 */

function printUsage(programName) {
    console.log("Usage:");
    console.log(`${programName} batch [folder] -- Convert all the .map file in the folder path.` );
}

if (module.parent === undefined) {
    let myArgs = process.argv.slice(2);

    if (myArgs.length < 2) {
        printUsage(process.argv[0] + " " + process.argv[1]);
    } else {
        if (myArgs[0] === "batch") {
            console.log("Run batch conversion");
            parseAllInFolder(myArgs[1]);
        }
    }
}

