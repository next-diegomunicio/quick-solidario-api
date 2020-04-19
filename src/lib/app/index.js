const log = require('./log');
const Request = require('./request');

module.exports = {
    request (options) {
        return new Request(options);
    },
    error (name, code = 500) {
        const e = new Error(name);
        e.code = code;
        e.name = name;
        return e;
    },
    log
};
