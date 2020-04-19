const jwt = require('jsonwebtoken');
const google = require('lib/google');
const secret = process.env.AUTH_SECRET;
const duration = parseInt(process.env.AUTH_DURATION); // minutos
const { intersection } = require('lodash');

class Auth {

    async getUserFromGoogle (token) {
        const data = await google.verify(token);
        //TODO aquí debe salir un usuario que tenga el campo shopId con el valor (sin _tmp_) del slug de su tienda
        if (data && data.email && data.email.endsWith('.next@bbva.com')) {
            return { email: data.email, name: data.name, avatar: data.picture, roles: ['user', 'admnin'] };
        } else {
            throw new Error('Google invalid token');
        }
    }

    getUser (token) {
        const info = jwt.verify(token, secret);
        return info.data;
    }

    generateToken (user) {
        return jwt.sign({
            exp: Math.floor(Date.now() / 1000) + (duration * 60),
            data: user
        }, secret);
    }

    isAuth (userRoles = [], roles = []) {
        if (!Array.isArray(roles)) {
            roles = [roles];
        }
        if (roles.length !== 0) {
            const inter = intersection(roles, userRoles);
            return inter.length !== 0;
        } else {
            return true;
        }
    }
};

module.exports = new Auth();
