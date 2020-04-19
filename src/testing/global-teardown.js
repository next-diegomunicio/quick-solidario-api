const { teardown: teardownDevServer } = require('jest-dev-server');

module.exports = async function globalTeardown() {
    if (process.env.ciTesting === undefined) { // SÓLO HACEMOS ESTO PARA LOCAL
        await teardownDevServer();
    }
};