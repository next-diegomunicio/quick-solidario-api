const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = process.env.AUTH_GOOGLE_LOGIN_CLIENT;
const client = new OAuth2Client(CLIENT_ID);

class Google {
    async verify(token) {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        return ticket.getPayload();
    }
}

module.exports = new Google();