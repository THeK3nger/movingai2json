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

/******************************************************************************
 * FILE OPERATIONS
 *
 */

var fs = require('fs');

/**
 * Get a .map file and produce a file .map.json with the JSON representation of
 * the map.
 * @param filePath The input file path.
 */
function parseMapFile(filePath, onComplete) {
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

exports.parseMapString = parseMapString;
exports.parseMapFile = parseMapFile;