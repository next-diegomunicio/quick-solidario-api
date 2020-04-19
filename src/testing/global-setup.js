const { setup: setupDevServer } = require('jest-dev-server');

module.exports = async function globalSetup() {
    if (process.env.ciTesting === undefined) { // SÓLO HACEMOS ESTO PARA LOCAL
        await setupDevServer({
            command: 'npm run test-local-server',
            launchTimeout: 10000,
            port: 3000,
            debug: true
        });
    }
};