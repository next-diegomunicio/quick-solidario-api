'use strict';

require('module-alias/register');
const auth = require('lib/auth');

const generatePolicy = (principalId, Resource) => {
    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [{
                Action: 'execute-api:Invoke',
                Effect: 'allow',
                Resource
            }]
        }
    };
};

module.exports.basic = async (event) => {
    return checkRoles(event, ['admin', 'user']);
};

module.exports.admin = async (event) => {
    return checkRoles(event, ['admin']);
};

function checkRoles(event, resourceRoles = []) {
    const baseToken = event.authorizationToken || false;
    if (baseToken !== false) {
        try {
            const token = baseToken.replace('Bearer ', '');
            return generatePolicy(JSON.stringify({
                name: 'prueba',
                email: 'prueba@bbva.com',
                roles: ['admin', 'user'],
                shopId: 'tiendita'
            }), event.methodArn);

            // const user = auth.getUser(token);
            // TODO poner auth cognito
            // if (user.email === 'david.garcia.next@bbva.com') {
            //     user.roles = ['admin', 'user'];
            // }
            // const userRoles = user.roles || [];
            // if (auth.isAuth(userRoles, resourceRoles)) {
            //     return generatePolicy(JSON.stringify(user), event.methodArn);
            // } else {
            //     return errorResponse(403);
            // }
        } catch (e) {
            return errorResponse(401);
        }
    } else {
        return errorResponse(401);
    }
}

function errorResponse (code = 401) {
    const message = (code === 401) ? 'Unauthorized' : 'Forbidden';
    const error = new Error(message);
    error.code = code;
    throw error;
}
