require('module-alias/register');
const app = require('app');
const model = require('model/shops');
const CustomError = app.error;

module.exports.list = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const size = request.query.size;
        const start = request.query.start;
        const country = request.query.country || false;
        const cp = request.query.cp || false;
        const pending = (request.query.pending === '1');
        const fields = ['title', 'categories', 'description', 'cp', 'country', 'id'];
        if (country !== false) { // podemos buscar las tiendas de un país
            const data = await model.list({ cp, country, size, start, pending, fields });
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

module.exports.get = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        const data = await model.get({ id });
        if (data === null) {
            return request.response({
                code: 404
            });
        } else {
            return request.response({
                code: 200,
                data
            });
        }
    } catch (error) {
        return request.error({ error });
    }
};

// only admin users
module.exports.put = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        const old = await model.get({ id });
        if (old !== null) {
            const item = request.body;
            await model.put({ id, item });
            return request.response({
                code: 202
            });
        } else {
            return request.response({ code: 404 });
        }
    } catch (error) {
        return request.error({ error });
    }
};

// only shop admin
module.exports.patch = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        const item = request.body;
        const old = await model.get({ id });
        if (old !== null) {
            const validUpdateFields = ['categories', 'details', 'description', 'title'];
            validUpdateFields.forEach((field) => {
                const value = item[field];
                if (value !== undefined) {
                    old[field] = value;
                }
            });
            await model.put({ id, item: old });
            return request.response({
                code: 202
            });
        } else {
            return request.response({ code: 404 });
        }
    } catch (error) {
        return request.error({ error });
    }
};


module.exports.del = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        await model.del({ id });
        return request.response({
            code: 202
        });
    } catch (error) {
        return request.error({ error });
    }
};

module.exports.activate = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        await model.activate({ id });
        return request.response({
            code: 202
        });
    } catch (error) {
        return request.error({ error });
    }
};

module.exports.logoUrl = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        const url = await model.logoUrl({ id });
        return request.response({
            code: 200,
            data: { url }
        });
    } catch (error) {
        return request.error({ error });
    }
};

