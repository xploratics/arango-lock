describe('lock', function () {
    it('should not crash', function () {
        return util
            .ensureDatabaseExists({ server, name: 'db'})
            .then(_ => arangoLock.lock({ server, name: 'lock1' }))
            .then(release => release());
    });

    it('should be able to run twice without crash', function () {
        return arangoLock
            .lock({ server, name: 'lock1' })
            .then(release => release());
    });

    it('should prevent concurrent access', function () {
        var l1 = false;
        var l2 = false;

        return arangoLock
            .lock({ server, name: 'lock1' })
            .then(function (release1) {
                setTimeout(function () {
                    l1 = true;
                    expect(l2).to.be.false;
                    release1();
                }, 100);

                return arangoLock
                    .lock({ server, name: 'lock1' })
                    .then(function (release2) {
                        l2 = true;
                        expect(l1).to.be.true;
                        release2();
                    });
            });
    });
});