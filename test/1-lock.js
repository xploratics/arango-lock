describe('lock', function () {
    it('should not crash', function () {
        return util
            .ensureDatabaseExists(database)
            .then(_ => lock.acquire({ database, name: 'lock1' }))
            .then(release => release());
    });

    it('should be able to run twice without crash', function () {
        return lock
            .acquire({ database, name: 'lock1' })
            .then(release => release());
    });

    it('should prevent concurrent access', function () {
        var l1 = false;
        var l2 = false;

        return lock
            .acquire({ database, name: 'lock1' })
            .then(function (release1) {
                setTimeout(function () {
                    l1 = true;
                    expect(l2).to.be.false;
                    release1();
                }, 100);

                return lock
                    .acquire({ database, name: 'lock1' })
                    .then(function (release2) {
                        l2 = true;
                        expect(l1).to.be.true;
                        release2();
                    });
            });
    });

    it('should overwrite expired lock', function () {
        var collection = database.collection('locks');

        return collection
            .remove('expiredLock').catch(_ => 0)
            .then(_ => collection.save({ _key: 'expiredLock', lockId: '123', date: new Date(2016, 0, 1) }))
            .then(_ => lock.acquire({ database, name: 'expiredLock' }))
            .then(release => release());
    });
});