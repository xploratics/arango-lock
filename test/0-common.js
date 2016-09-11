global.expect = require('chai').expect;
global.lock = require('../');
global.database = require('arangojs')({ url: 'http://root@127.0.0.1:8529' }).useDatabase('db');
global.util = require('arango-util');