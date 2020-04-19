require('module-alias/register');
const app = require('app');
const model = require('model/orders');
const { isPendingShop } = require('model/shops');
const CustomError = app.error;

module.exports.list = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        let filter = (request.query.pending === undefined) ? false : request.query.pending;
        request.validateShopUser(id);
        const data = await model.list({ id, filter });
        return request.response({
            code: 200,
            data
        });
    } catch (error) {
        return request.error({ error });
    }
};

module.exports.get = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        const orderId = request.params.orderId;
        const data = await model.get({ id, orderId });
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

module.exports.post = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        if (isPendingShop(id) === false) {
            const item = request.body;
            const data = await model.post({ id, item });
            return request.response({
                code: 201,
                data
            });
        } else {
            return request.error({ error: CustomError('Pending shop', 400) });
        }
    } catch (error) {
        return request.error({ error });
    }
};

module.exports.patch = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        if (isPendingShop(id) === false) {
            const orderId = request.params.orderId;
            const data = await model.patch({ id, orderId });
            return request.response({
                code: 201,
                data
            });
        } else {
            return request.error({ error: CustomError('Pending shop', 400) });
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
        const orderId = request.params.orderId;
        await model.del({ id, orderId });
        return request.response({
            code: 202
        });
    } catch (error) {
        return request.error({ error });
    }
};
