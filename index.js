var assert = require('assert');
var dbFuncString = String(dbFunc);
var debug = require('debug')('arango-lock');
var Promise = require('bluebird');
var shortid = require('shortid');
var util = require('arango-util');

exports.acquire = function (options) {
    assert.ok(options, 'options is required');

    var expiration = options.expiration || 5000;
    var lockId = shortid();
    var name = options.name;
    var server = options.server;
    var ping = true;

    assert.ok(name, 'name is required');
    assert.ok(expiration >= 5000, 'expiration should be greater or equal to 5000ms');
    assert.ok(server, 'server should be an arangodb database object');

    function acquireLock(resolve, reject) {
        debug(`acquiring lock '${name}'`);

        util.ensureCollectionExists({ server: server, name: 'locks' })
            .then(() => updateLockInDb('acquire'))
            .catch(reject)
            .then(function (acquired) {
                if (acquired) {
                    debug(`lock '${name}' acquired`);
                    resolve();
                } else {
                    debug(`lock '${name}' is in used, will reattempt to acquire the lock.`);
                    setTimeout(() => acquireLock(resolve, reject), 500);
                }
            });
    }

    function heartBeat() {
        setTimeout(function () {
            if (ping) {
                debug(`heartBeat lock '${name}''`);
                updateLockInDb('heartBeat').then(heartBeat);
            }
        }, expiration / 2);
    }

    function releaseLock() {
        if (ping) {
            debug(`attempting to release lock '${name}'`);
            ping = false;
            return updateLockInDb('release').then(function (v) {
                debug(`lock '${name}' released`);
                return v;
            });
        }
    }

    function updateLockInDb(action) {
        return server.transaction({ write: ['locks'] }, dbFuncString, { action, name, lockId, expiration });
    }

    var promise = new Promise(acquireLock);

    return promise.then(function () {
        heartBeat();
        return releaseLock;
    });
}

function dbFunc(params) {
    var locks = require('org/arangodb').db.locks;
    var lock = locks.documents([params.name]).documents[0];
    var isExpired = lock && (new Date() - new Date(lock.date)) >= params.expiration;
    var isValid = lock && lock.lockId === params.lockId;

    function checkErrors() {
        if (isExpired) throw new Error('Lock expired.');
        if (!isValid) throw new Error('Lock invalid.');
    }

    switch (params.action) {
        case 'acquire':
            if (lock && !isExpired) return false;

            var doc = { lockId: params.lockId, date: new Date() };

            if (lock) {
                locks.replace(params.name, doc);
            } else {
                doc._key = params.name;
                locks.save(doc);
            }
            return true;

        case 'heartBeat':
            checkErrors();
            locks.replace(params.name, { date: new Date() });
            return true;

        case 'release':
            checkErrors();
            locks.remove(params.name);
            return true;
    }

    throw new Error('Invalid action');
}