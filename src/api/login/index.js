require('module-alias/register');
const app = require('lib/app');
const auth = require('lib/auth');
const { getUserScore } = require('lib/game');


module.exports.login = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const body = request.body;
        if (body.token) { // login google
            const user = await auth.getUserFromGoogle(body.token);
            user.score = await getUserScore(user.email);
            const token = auth.generateToken(user);
            return request.response({
                code: 200,
                data: { token, user }
            });
        } else {
            return request.error({ error: new Error('Token Required'), code: 400 });
        }
    } catch (error) {
        return request.error({ error: new Error('Invalid User'), code: 401 });
    }
};

module.exports.me = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const user = request.getUser();
        return request.response({
            code: 200,
            data: { user }
        });
    } catch (error) {
        return request.error({ error: new Error('Invalid User'), code: 401 });
    }
};
