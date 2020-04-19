const Log = require('../log');
const uuid = require('uuid/v1');
const auth = require('lib/auth');
const { xss } = require('lib/common');
const VALID_DOMAINS = process.env.VALID_DOMAINS;
const customHeaders = {
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,PATCH,DELETE',
    'Access-Control-Allow-Origin': '*'
};

const HTTP_CODES = {
    '200': 'OK',
    '201': 'CREATED',
    '202': 'ACCEDPTED',
    '204': 'NO CONTENT',
    '404': 'NOT FOUND'
};

module.exports = class Request {
    constructor ({ event, context }) {
        context.callbackWaitsForEmptyEventLoop = false;
        this._event = event;
        this._context = context;
        this._id = uuid();
        this.log = new Log(this);
        this._date = new Date();
        this._user = null;
        this._parseEvent();
        this._validateOrigin();
        this._setUser();
        this.log.info({ msg: 'Start request' });
    }

    id () {
        return this._id;
    }

    _validateOrigin () {
        if (VALID_DOMAINS !== 'null') {
            const origin = (this.headers.origin || this.headers.Origin || '').trim();
            const domains = VALID_DOMAINS.split(',');
            if (domains.includes(origin) === false) {
                throw new Error('Forbidden');
            }
        }
    }

    _setUser () {
        try {
            if (this._user === null) {
                this._user = JSON.parse(this._event.requestContext.authorizer.principalId);
            }
        } catch (e) {
            this._user = null;
        }
    }

    getUser() {
        this._setUser();
        if (this._user !== null) {
            return this._user;
        } else {
            throw new Error('User Not Logged');
        }
    }

    // se podrían hacer cosas de roles
    isAuth(auth = {}) {
        return (this._user !== null);
    }

    isAdmin() {
        const { roles } = this.getUser();
        return roles.includes('admin');
    }

    error({ error, msg, code }) {
        const out = this._getErrorCode(error);
        if (msg !== undefined) {
            out.message = msg;
        } else if (HTTP_CODES.hasOwnProperty(code)) {
            out.message = HTTP_CODES[code];
        }

        if (code !== undefined) {
            out.code = code;
        }
        this.log.error({ error });
        return {
            headers: customHeaders,
            statusCode: out.code,
            body: JSON.stringify(out)
        };
    }

    validateShopUser(id) {
        const { shopId } = this.getUser();
        const isAdmin = this.isAdmin();
        if ((isAdmin === false) && (id !== shopId)) {
            const e = new Error('Forbidden');
            e.code = 403;
            throw e;
        } else {
            return true;
        }
    }

    _getErrorCode (error = {}) {
        const message = error.message || error.name;
        const code = error.code || false;
        if (code === false) {
            switch (message) {
                case 'Invalid User':
                    return { code: 403, message };
                case 'User Not Logged':
                    return { code: 401, message };
                default:
                    return { code: 500, message: 'Internal error' };
            }
        } else {
            return { code, message };
        }
    }

    _parseEvent () {
        const event = this._event || {};
        this.query = xss(event.queryStringParameters || {});
        if (event.body) {
            try {
                this.body = JSON.parse(xss(event.body));
            } catch (e) {
                this.body = xss(event.body);
            }
        }
        this.headers = xss(event.headers || {});
        this.params = xss(event.pathParameters || {});
    }

    response({ data = false, code = 200, count = false, msg = false }) {
        try {
            // pillar token si hay y poner en headers
            const out = {};
            if (count !== false) {
                out.count = count;
            }
            if (data !== false) {
                out.data = data;
            } else if (msg === false && HTTP_CODES.hasOwnProperty(code)) {
                out.message = HTTP_CODES[code];
            }

            if (msg !== false) {
                out.message = msg;
            }
            return {
                headers: customHeaders,
                statusCode: code,
                body: JSON.stringify(out)
            };
        } catch (error) {
            this.error({ error });
        }
    }

    getUserId () {
        return 'id-unico-cognito';
    }

    getTime () {
        return this._date.getTime();
    }
};
