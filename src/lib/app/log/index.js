class Log {
    constructor(request) {
        this._request = request;
    }
    info (msg) {
        console.log(msg);
    }

    error ({ error, e, msg, message }) {
        error = error || e;
        console.log('Error: ', error, e, message, msg);
    }
};

module.exports = Log;