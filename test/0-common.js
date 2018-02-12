global.expect = require('chai').expect;
global.lock = require('../');
global.database = require('arangojs')({
    url: 'http://localhost:8529'
}).useDatabase('db').useBasicAuth('root', '');
global.util = require('arango-util');