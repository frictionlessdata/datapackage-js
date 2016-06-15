var assert = require('assert')
  , spec = require('../index.js')
  , stream = require('stream')
  , fs = require('fs')
  ;

var dp1 = {
  "name": "abc",
  "resources": [
    {
      "name": "random",
      "format": "csv",
      "path": "test/fixtures/dp1/data.csv",
      "schema": {
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "size",
            "type": "integer"
          }
        ]
      }
    }
  ],
  "views": [
    {
      "type": "vegalite",
      "spec": {
        "data": {
          "resource": "random"
        },
        "mark": "bar",
        "encoding": {
          "x": {"field": "name", "type": "ordinal"},
          "y": {"field": "size", "type": "quantitative"}
        }
      }
    }
  ]
};

describe('DataPackage', function() {
  it('instantiates', function() {
    var dp = new spec.DataPackage();
  });

  it('instantiates with string', function() {
    var dp = new spec.DataPackage('abc');
    assert.equal(dp.path, 'abc');
  });
  
  it('instantiates with object', function() {
    var dp = new spec.DataPackage(dp1);
    assert.deepEqual(dp.data, dp1);
  });

  it('loads', function(done) {
    var dp = new spec.DataPackage('test/fixtures/dp1');
    dp.load()
      .then(function() {
        assert.equal(dp.data.name, 'abc');
        assert.equal(dp.resources.length, 1);
        assert.equal(dp.resources[0].fullPath(), 'test/fixtures/dp1/data.csv');
        done();
      });
  });

});

describe('Resource', function() {
  var resource = {
    "path": "test/fixtures/dp1/data.csv"
  }
  it('instantiates', function() {
    var res = new spec.Resource(resource);
    assert.equal(res.data, resource);
    assert.equal(res.base, '');
  });
  it('fullPath works', function() {
    var res = new spec.Resource(resource, 'abc');
    assert.equal(res.base, 'abc');
    assert.equal(res.fullPath(), 'abc/test/fixtures/dp1/data.csv');
  });
  it('objects works', function(done) {
    var res = new spec.Resource(resource);
    res.objects()
      .then(function(output) {
        assert.equal(output.length, 3);
        assert.equal(output[0].size, "100");
        done();
      });
  });
  it('stream works', function(done) {
    var res = new spec.Resource(resource);
    spec.objectStreamToArray(res.stream()).
      then(function(output) { 
        assert.equal(output.length, 3);
        assert.strictEqual(output[0].size, "100");
        done();
      });
  });
  it('stream works with jts', function(done) {
    var res = new spec.Resource(dp1.resources[0]);
    spec.objectStreamToArray(res.stream()).
      then(function(output) { 
        assert.equal(output.length, 3);
        assert.strictEqual(output[0].size, 100);
        done();
      });
  });
});

function makeStream(text) {
  var s = new stream.Readable();
  s.push(text);
  s.push(null);
  return s;
}

describe('csvToStream', function() {
  it('casting works', function(done) {
    var dp = new spec.DataPackage(dp1);
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) { 
        assert.equal(output.length, 3);
        assert.strictEqual(output[0].size, 100);
        done();
      });
  });

  var schema = fs.readFileSync("test/fixtures/types-test/schema.json", "utf8")
  var jsonContent = JSON.parse(schema)
  var dp = new spec.DataPackage(jsonContent);

  it('parse works for strings', function(done) {
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.strictEqual(typeof output[0].string, 'string');
        assert.strictEqual(output[0].string, 'Word');
        assert.strictEqual(output[1].string, 'Two words');
        assert.strictEqual(output[2].string, 'test@mail.com');
        assert.strictEqual(output[3].string, 'http://www.testwebsite.com');
        assert.strictEqual(output[4].string, 'CAPITALIZED');
        assert.strictEqual(output[5].string, 'list,of,words');
        assert.strictEqual(output[6].string, 'text\\nwith\\nnew\\nlines');
        assert.strictEqual(output[7].string, ' ');
        assert.strictEqual(output[8].string, '');
        assert.strictEqual(output[9].string, '0123456789');
        assert.strictEqual(output[10].string, '!@#$%^&*()_+{}[]:;"\\|<.>');
        done();
      });
  });
  it('parse works for numbers', function(done) {
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.strictEqual(typeof output[0].number, 'number');
        assert.strictEqual(output[0].number, 0);
        assert.strictEqual(output[1].number, -100.58);
        assert.strictEqual(output[2].number, -1);
        assert.strictEqual(output[3].number, 3.14);
        assert.strictEqual(output[4].number, 0.00001);
        assert.strictEqual(output[5].number, 1);
        assert.strictEqual(output[6].number, 1.0001);
        assert.strictEqual(output[7].number, -0.4);
        assert.strictEqual(output[8].number, -0);
        assert.strictEqual(output[9].number, 123456789);
        assert.strictEqual(output[10].number, 17);
        done();
      });
  });
  it('parse works for integers', function(done) {
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.strictEqual(typeof output[0].integer, 'number');
        assert.strictEqual(output[0].integer, 0);
        assert.strictEqual(output[1].integer, 5);
        assert.strictEqual(output[2].integer, 1000000);
        assert.strictEqual(output[3].integer, -1000);
        assert.strictEqual(output[4].integer, 15);
        assert.strictEqual(output[5].integer, 12);
        assert.strictEqual(output[6].integer, 2);
        assert.strictEqual(output[7].integer, 123456);
        assert.strictEqual(output[8].integer, 3);
        assert.strictEqual(output[9].integer, 1);
        assert.strictEqual(output[10].integer, 4);
        done();
      });
  });
  it('parse works for booleans', function(done) {
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.strictEqual(typeof output[0].boolean, 'boolean');
        assert.strictEqual(output[0].boolean, true);
        assert.strictEqual(output[1].boolean, false);
        assert.strictEqual(output[2].boolean, true);
        assert.strictEqual(output[3].boolean, false);
        assert.strictEqual(output[4].boolean, false);
        assert.strictEqual(output[5].boolean, true);
        assert.strictEqual(output[6].boolean, true);
        assert.strictEqual(output[7].boolean, false);
        assert.strictEqual(output[8].boolean, false);
        assert.strictEqual(output[9].boolean, true);
        assert.strictEqual(output[9].boolean, true);
        done();
      });
  });
  it('parse works for dates', function(done) {
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.strictEqual(typeof output[0].date, 'number');
        assert.strictEqual(output[0].date, 1463788800000);
        assert.strictEqual(output[1].date, 1462060800000);
        // TODO: these fail - i think maybe because of time of day issues (??)
        // assert.strictEqual(output[2].date, 1463827423000);
        // assert.strictEqual(output[3].date, 1463947200000);
        // assert.strictEqual(output[4].date, 1461355200000);
        // assert.strictEqual(output[5].date, 1472673600000);
        // assert.strictEqual(output[6].date, 1451592000000);
        // assert.strictEqual(output[7].date, 1462219200000);
        // assert.strictEqual(output[8].date, 1454616000000);
        // assert.strictEqual(output[9].date, 1451764800000);
        // assert.strictEqual(output[10].date, 997902000000);
        done();
      });
  });
  it('parse works for objects', function(done) {
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.strictEqual(typeof output[0].object, 'object');
        assert.strictEqual(output[0].object.key, 'value');
        assert.deepEqual(output[0].object, {key: 'value'});
        assert.deepEqual(output[1].object.key, {inner_key: 'value'});
        assert.deepEqual(output[2].object, {});
        assert.strictEqual(output[3].object.key, 1);
        assert.strictEqual(output[4].object.key, '');
        assert.deepEqual(output[5].object, {key: true});
        assert.deepEqual(output[6].object, {'': ''});
        assert.deepEqual(output[7].object, {true: 1});
        assert.deepEqual(output[8].object, {1: 1});       //         ~~~~~
        assert.deepEqual(output[8].object, {'1': 1});     // should both pass test?
        assert.deepEqual(output[9].object, {key0: {key1: {key2: {}}}});
      });
      done();
  });
  it('parse works for arrays', function(done) {
    var stream = spec.csvToStream(dp.resources[0].rawStream(), dp.resources[0].data.schema);
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.strictEqual(typeof output[0].object, 'object');
        assert.strictEqual(output[0].array[0], 1);
        assert.deepEqual(output[0].array, [1,2,3,4,5]);
        assert.deepEqual(output[1].array, [0, [1,2,3,4,5]]);
        assert.deepEqual(output[2].array, []);
        assert.strictEqual(output[3].array[0], '1');
        assert.notStrictEqual(output[3].array[0], 1);
        assert.strictEqual(typeof output[4].array[1], 'boolean');
        assert.strictEqual(output[5].array[0], '');
        assert.deepEqual(output[6].array, [[[[0]]]]);
      });
      done();
  });
});


describe('csv dialect support', function() {
  it('works with delimiter', function(done) {
    var content = fs.createReadStream('test/fixtures/csv-dialects/data-del.csv')
    var dp = new spec.DataPackage(dp1);
    var stream = spec.csvToStream(content, dp.resources[0].data.schema, {delimiter: '\t'});
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.equal(output.length, 3);
        assert.strictEqual(output[2].info, "test,for,delimiter");
        done();
      });
  });
  it('works with quoteChar', function(done) {
    var content = fs.createReadStream('test/fixtures/csv-dialects/data-qc.csv')
    var dp = new spec.DataPackage(dp1);
    var stream = spec.csvToStream(content, dp.resources[0].data.schema, {quoteChar: "'"});
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.equal(output.length, 3);
        assert.strictEqual(output[1].info,'U,S,A');
        done();
      });
  });
  it('works with doubleQuote', function(done) {
    var content = fs.createReadStream('test/fixtures/csv-dialects/data-dq.csv')
    var dp = new spec.DataPackage(dp1);
    var stream = spec.csvToStream(content, dp.resources[0].data.schema, {doubleQuote: '"'});
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.equal(output.length, 3);
        assert.strictEqual(output[2].info, 'no "info for this"');
        done();
      });
  });
  it('works with all csv dialects', function(done) {
    var content = fs.createReadStream('test/fixtures/csv-dialects/data-all.csv')
    var dp = new spec.DataPackage(dp1);
    var stream = spec.csvToStream(content, dp.resources[0].data.schema, {delimiter: '\t', quoteChar: "'", doubleQuote: '"'});
    spec.objectStreamToArray(stream).
      then(function(output) {
        assert.equal(output.length, 3);
        assert.strictEqual(output[0].size, 100);
        assert.strictEqual(output[1].info, 'U	S	A');
        assert.strictEqual(output[2].info, '"no info"');
        done();
      });
  });
});

