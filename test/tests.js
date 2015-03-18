var fs = require('fs');
var assert = require("assert");
var movingai2json = require("../lib/movingai2json.js");

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
});
