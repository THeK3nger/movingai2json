import { MovingAIMap, MovingAIScene } from "../src/movingai2json";

import assert from "assert";
import fs from "fs-extra";

const movingai2json = require("../dist/movingai2json.js");

describe("Parsing", () => {
    describe("#parseMapString()", () => {
        let parsedMap: MovingAIMap;

        before((done) => {
            fs.readFile("./test/keydoor.map", (err, data) => {
                if (err) {
                    throw err;
                }
                parsedMap = movingai2json.parseMapString(data.toString());
                done();
            });
        });

        it("parsed map width should be 20", () => {
            assert.equal(20, parsedMap.width);
        });

        it("parsed map height should be 20", () => {
            assert.equal(20, parsedMap.height);
        });
    });

    describe("#parseMapFile()", () => {
        before(async () => {
            await movingai2json.parseMapFile("./test/keydoor.map");
        });

        it("load output JSON and check if width is 20", () => {
            fs.readFile("./test/keydoor.map.json", (err, data) => {
                const parsedJSON = JSON.parse(data.toString());
                assert.equal(20, parsedJSON.width);
            });
        });

        it("load output JSON and check if height is 20", () => {
            fs.readFile("./test/keydoor.map.json", (err, data) => {
                const parsedJSON = JSON.parse(data.toString());
                assert.equal(20, parsedJSON.height);
            });
        });
    });

    describe("#parseAllInFolder()", () => {
        before(async () => {
            await movingai2json.parseAllInFolder("./test");
        });

        it("check if all the files are generated", () => {
            let keydorParsed = false;
            let arenaScenParsed = false;
            fs.readdir("./test", (err, files) => {
                for (let i = 0; i < files.length; i++) {
                    if (files[i] === "keydoor.map.json") {
                        keydorParsed = true;
                    }
                    if (files[i] === "arena.map.scen.json") {
                        arenaScenParsed = true;
                    }
                }
                assert.equal(true, keydorParsed && arenaScenParsed);
            });
        });
    });

    describe("#parseScenString()", () => {
        let parsedScene: MovingAIScene;

        before((done) => {
            fs.readFile("./test/arena.map.scen", (err, data) => {
                if (err) {
                    throw err;
                }
                parsedScene = movingai2json.parseScenString(data.toString());
                done();
            });
        });

        it("random access in the parsed JSON", () => {
            // All the scenes belong to the same map.
            for (let i = 0; i < parsedScene.length; i++) {
                assert.equal(
                    "maps/dao/arena.map",
                    parsedScene[i].map,
                    "Assertion Error on item " +
                        i +
                        ". Is " +
                        parsedScene[i].map,
                );
            }
            assert.equal(parsedScene[5].startX, "1");
        });
    });
});
