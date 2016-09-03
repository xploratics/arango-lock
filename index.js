var debug = require('debug')('arango-lock');
var Promise = require('bluebird');
var shortid = require('shortid');
var util = require('arango-util');

exports.lock = function (options) {
    assert.ok(options, 'options is required');

    var expiration = options.expiration || 60000;
    var func = String(dbFunc);
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
                    setTimeout(() => acquireLock(resolve, reject), expiration / 2)
                }
            });
    }

    function hearBeat() {
        setTimeout(function () {
            if (ping)
                updateLockInDb('hearBeat').then(hearBeat);
        }, expiration / 2);
    }

    function releaseLock() {
        ping = false;
        return updateLockInDb('release');
    }

    function updateLockInDb(action) {
        return server.collection('locks').transaction({ write: ['locks'] }, func, { action, name, lockId });
    }

    var promise = new Promise(acquireLock);

    return promise.then(function () {
        hearBeat();
        return releaseLock;
    });
}

function dbFunc(params) {
    var locks = require('org/arangodb').db.locks;
    var lock = locks.documents([params.name]).documents[0];
    var isExpired = lock && (new Date() - lock.date).valueOf() < params.expiration;
    var isValid = lock && lock.lockId === params.lockId;

    function checkErrors() {
        if (isExpired) throw new Error('Lock expired.');
        if (!isValid) throw new Error('Lock invalid.');
    }

    switch (params.operation) {
        case 'acquire':
            if (lock && !isExpired) return false;
            if (!lock) lock = { _key: params.name };

            lock.lockId = params.lockId
            lock.pingDate = new Date();
            locks.save(lock);
            return true;

        case 'hearBeat':
            checkErrors();
            lock.pingDate = new Date();
            locks.save(lock);
            return true;

        case 'release':
            checkErrors();
            locks.remove(params.name);
            return true;
    }

    throw new Error('Invalid operation');
}