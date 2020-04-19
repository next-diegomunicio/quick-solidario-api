const { request } = require( __dirname + '/../../lib/testing');

test('testing api endpoint', async () => {
    const data = await request({ url: 'prueba' });
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('data');
    expect(data.status).toBe(200);
    const out = process.env.ciTesting ? 'prueba desde secret' : 'feo';
    expect(data.data).toBe(out);

});

test('testing api endpoint 404', async () => {
    try {
        const data = await request({ url: 'error' });
    } catch (e) {
        expect(e).toHaveProperty('response');
        expect(e.response).toHaveProperty('status');
        expect(e.response.status).toBe(404);
    }
});