require('module-alias/register');
const OrderedUUID = require('ordered-uuid');
const app = require('app');
const Joi = require('joi');
const AWS = require('aws-sdk');
const { getCatalog } = require('model/products');
const PRIVATE_BUCKET = process.env.BUCKET_PRIVATE;
const CustomError = app.error;
const s3 = new AWS.S3();
const PENDING_PREFIX = 'pnd-';
const COMPLETED_PREFIX = 'cmp-';

const baseCatalog = {
    products: []
};

const Order = Joi.object().keys({
    id: Joi.string().required(),
    phone: Joi.string().required(),
    total: Joi.number().required(),
    name: Joi.string().required(),
    email: Joi.string().email(),
    notes: Joi.string(),
    direction: Joi.object().keys({
        cp: Joi.number().required(),
        address: Joi.string().required(),
        additional: Joi.string()
    }).required(),
    products: Joi.array().items(
        Joi.object().keys({
            id: Joi.string().required(),
            units: Joi.number().required(),
            price: Joi.number().required(),
            total: Joi.number().required()
        })
    )
});

async function validate(item) {
    return new Promise((resolve, reject) => {
        Joi.validate(item, Order, (err) => {
            return err ? reject(CustomError(err.message, 412)) : resolve(item);
        });
    });
}

async function deleteOrder({ id, orderId, item = false  }) {
    item = item || await getOrder({ id, orderId });
    if (item === null) {
        throw CustomError('Not found', 404);
    } else {
        const Key = `shops/${ id }/${ orderId }.json`;
        const Bucket = PRIVATE_BUCKET;
        return s3.deleteObject({ Key, Bucket });
    }
}

async function getOrder({ id = false, orderId = false, Key = false }) {
    Key = Key || `shops/${ id }/${ orderId }.json`;
    const Bucket = PRIVATE_BUCKET;
    try {
        const { Body } = await s3.getObject({ Bucket, Key }).promise();
        return JSON.parse(Body.toString('utf-8'));
    } catch (e) {
        return null;
    }
}

async function checkPrices({ shopId, order }) {
    const products = order.products;
    const catalog = (await getCatalog({id: shopId})).products;
    let total = 0;
    products.forEach(({id, units}, index) => {
        const realProductInfo = catalog.find((i) => i.id === id);
        if (realProductInfo !== undefined) {
            const subtotal = parseFloat((realProductInfo.price * units).toFixed(2));
            const item = {id, units, price: realProductInfo.price, total: subtotal};
            total += subtotal;
            products[index] = item;
        } else {
            throw CustomError('Invalid product ' + id);
        }
    });
    order.total = parseFloat(total.toFixed(2));
}

async function postOrder({ item, id }) {
    item.id = PENDING_PREFIX + OrderedUUID.generate();
    const products = item.products || [];
    if (products.length === 0) {
        throw CustomError('Empty order', 400);
    } else {
        await validate(item);
        await checkPrices({ shopId: id, order: item });
        await saveOrder({ item, id, orderId: item.id });
        return item;
    }
}

/**
 * Cambia el estado del pedido (cambiándole el nombre) a completado
 * @param item
 * @param id
 * @returns {Promise<updatedOrder>}
 */
async function patchOrder({ id, orderId }) {
    const old = await getOrder({ id, orderId });
    if (old === null) {
        throw CustomError('Not found', 404);
    } else {
        old.id = orderId.replace(PENDING_PREFIX, COMPLETED_PREFIX);
+        await Promise.all([
            deleteOrder({ id, orderId, item: old }),
            saveOrder({ item: old, id, orderId: old.id })
        ]);
        return old;
    }
}

async function saveOrder({ item, id, orderId }) {
    const Bucket = PRIVATE_BUCKET;
    const Key = `shops/${ id }/${ orderId }.json`;
    const ContentType = 'application/json';
    const ACL = 'private';
    const ServerSideEncryption = 'AES256';
    const Body = JSON.stringify(item);
    await s3.putObject({ Body, Bucket, Key, ContentType, ACL, ServerSideEncryption}).promise();
}

async function listOrders({ id, start, filter = false, size = 20 }) {
    const Bucket = PRIVATE_BUCKET;
    let prefix = '';
    if (filter !== false) {
        prefix = (filter === '1') ? COMPLETED_PREFIX : PENDING_PREFIX;
    }
    const Prefix = `shops/${ id }/${ prefix }`;
    const MaxKeys = size;
    const params = {
        Bucket,
        Delimiter: '/',
        MaxKeys,
        Prefix
    };
    const data = await s3.listObjectsV2(params).promise();
    if (data && data.Contents && data.Contents.length !== 0) {
        const promises = data.Contents.map(({ Key }) => getOrder({ Key }));
        return Promise.all(promises);
    } else {
        return [];
    }
}

module.exports.get = getOrder;

module.exports.patch = patchOrder;

module.exports.post = postOrder;

module.exports.del = deleteOrder;

module.exports.list = listOrders;
