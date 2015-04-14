var fs = require('fs');
var assert = require("assert");
var movingai2json = require("../dist/movingai2json.js");

describe('Parsing', function(){
    describe('#parseMapString()', function(){
        var parsedMap;

        before(function(done) {
            fs.readFile('./test/keydoor.map', function (err, data) {
                if (err) {
                    throw err;
                }
                parsedMap = movingai2json.parseMapString(data.toString());
                done();
            });
        });

        it('parsed map width should be 20', function(){
            assert.equal(20, parsedMap.width);
        });

        it('parsed map height should be 20', function(){
            assert.equal(20, parsedMap.height);
        });
    });

    describe('#parseMapFile()', function() {
       before(function(done) {
           movingai2json.parseMapFile('./test/keydoor.map', function() {
               done();
           });
       });

        it('load output JSON and check if width is 20', function() {
            fs.readFile('./test/keydoor.map.json', function(err, data) {
                var parsedJSON = JSON.parse(data.toString());
                assert.equal(20, parsedJSON.width);
            });
        });

        it('load output JSON and check if height is 20', function() {
            fs.readFile('./test/keydoor.map.json', function(err, data) {
                var parsedJSON = JSON.parse(data.toString());
                assert.equal(20, parsedJSON.height);
            });
        });
    });

    describe('#parseAllInFolder()', function() {
        before(function(done) {
           movingai2json.parseAllInFolder('./test', function() { done(); });
        });

        it('check if all the files are generated', function() {
            var keydorParsed = false;
            var arenaScenParsed = false;
            fs.readdir('./test', function(err, files) {
                for (var i=0;i<files.length;i++) {
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

    describe('#parseScenString()', function() {
        var parsedScene;

        before(function(done) {
            fs.readFile('./test/arena.map.scen', function(err, data) {
                if (err) {
                    throw err;
                }
                parsedScene = movingai2json.parseScenString(data.toString());
                done();
            });
        });

        it('random access in the parsed JSON', function() {
            // All the scenes belong to the same map.
            for (var i=0;i<parsedScene.length;i++) {
                assert.equal('maps/dao/arena.map',parsedScene[i].map,"Assertion Error on item " + i + ". Is " + parsedScene[i].map);
            }
            assert.equal(parsedScene[5].startX,'1');
        });
    });


});
