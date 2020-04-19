require('module-alias/register');
const app = require('app');
const model = require('model/shops');
const CustomError = app.error;

module.exports.list = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const size = request.query.size;
        const start = request.query.start || false;
        const country = request.query.country || false;
        const cp = request.query.cp || false;
        const fields = ['title', 'categories', 'description'];
        const pending = false;
        if (cp !== false && country !== false) { // sólo podemos buscar las tiendas de un país y un cp para ahorrar costes
            const data = await model.list({ cp, country, size, start, fields, pending });
            return request.response({
                code: 200,
                data
            });
        } else {
            return request.error({ error: CustomError('CP and country are required', 412) });
        }
    } catch (error) {
        return request.error({ error });
    }
};

module.exports.post = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const item = request.body;
        // TODO poner reCaptcha
        // TODO pillar ID de cognito
        item.adminId = 'testId';
        await model.post({ item });
        return request.response({
            code: 201
        });
    } catch (error) {
        return request.error({ error });
    }
};

module.exports.checkSlug = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const slug = request.params.id;
        const isValid = await model.checkSlug({ slug });
        return request.response({
            code: 200,
            data: { isValid }
        });
    } catch (error) {
        return request.error({ error });
    }
};

