[![Build Status](https://travis-ci.org/xploratics/arango-lock.svg)](https://travis-ci.org/xploratics/arango-lock)

# arango-lock
Implements locking using arango database.

## Installation

```bash
npm install arango-lock
```

## Api

### lock
Acquire a lock asynchronously allowing concurrent works to continue during locking.

#### options

- server: arangojs database object
- name: name of the lock
- expiration: expiration of the lock if no beat is received. (Default: 5000ms)

#### example

```js
var server = require('arangojs')({ url: 'root@127.0.0.1:8529' });
var lock = require('arango-lock');

lock.acquire({ server, name: 'lock1' })
    .then(function (release) {
        // lock acquired, do some stuff.

        // release the lock after works done.
        return release();
    });
```

## Test

```bash
# 1. mount the database, recreate it if already mounted.
npm run mount-db

# 2. run the tests
npm run test

# 3. unmount the database
npm run unmount-db
```

## Licence
MIT License