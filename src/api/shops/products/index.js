require('module-alias/register');
const app = require('app');
const model = require('model/products');
const { isPendingShop } = require('model/shops');
const CustomError = app.error;

module.exports.list = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        const data = await model.list({ id });
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
        const productId = request.params.productId;
        const data = await model.get({ id, productId });
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

module.exports.put = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        if (isPendingShop(id) === false) {
            const productId = request.params.productId;
            const item = request.body;
            const data = await model.put({ id, productId, item });
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
        const productId = request.params.productId;
        await model.del({ id, productId });
        return request.response({
            code: 202
        });
    } catch (error) {
        return request.error({ error });
    }
};

module.exports.imageUrl = async (event, context) => {
    const request = app.request({ context, event });
    try {
        const id = request.params.id;
        request.validateShopUser(id);
        const productId = request.params.productId;
        const url = await model.imageUrl({ id, productId });
        return request.response({
            code: 200,
            data: { url }
        });
    } catch (error) {
        return request.error({ error });
    }
};

