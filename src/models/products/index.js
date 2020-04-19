require('module-alias/register');
const OrderedUUID = require('ordered-uuid');
const app = require('app');
const Joi = require('joi');
const { cloneDeep } = require('lodash');
const AWS = require('aws-sdk');
const { sanitizeSlug } = require('lib/common');
const PUBLIC_BUCKET = process.env.BUCKET_PUBLIC;
const CustomError = app.error;
const s3 = new AWS.S3();
const CONFIG_CACHE = 900; // seconds

const baseCatalog = {
    products: []
};

const Product = Joi.object().keys({
    id: Joi.string().required(),
    category: Joi.string().required(),
    title: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.number(),
    unit: Joi.string().required(),
    image: Joi.string().required(),
    images: Joi.array().items(
        Joi.object().keys({
            alt: Joi.string(),
            src: Joi.string().required()
        })
    )
});

async function validate(item) {
    return new Promise((resolve, reject) => {
        item.category = sanitizeSlug(item.category);
        Joi.validate(item, Product, (err) => {
            return err ? reject(CustomError(err.message, 412)) : resolve(item);
        });
    });
}

async function deleteProduct({ id, productId  }) {
    const catalog = await loadCatalog({ id });
    const index = catalog.products.findIndex((item) => item.id === productId);
    if (index === -1) {
        throw CustomError('Not found', 404);
    } else {
        catalog.products.splice(index, 1);
        await updateCatalog({ catalog, id });
    }
}

async function updateCatalog({ catalog, id }) {
    const Key = `static/shops/${ id }/products.json`;
    const Bucket = PUBLIC_BUCKET;
    const params = {
        Bucket,
        Key,
        ACL: 'public-read',
        Body: JSON.stringify(catalog),
        CacheControl: `max-age=${ CONFIG_CACHE }`,
        ContentType: 'application/json'
    };
    await s3.putObject(params).promise();
}

async function getProduct({ id, productId }) {
    const catalog = await loadCatalog({ id });
    return catalog.products.find((item) => item.id === productId) || null;
}

async function loadCatalog({ id }) {
    const Key = `static/shops/${ id }/products.json`;
    const Bucket = PUBLIC_BUCKET;
    try {
        const { Body } = await s3.getObject({ Bucket, Key }).promise();
        return JSON.parse(Body.toString('utf-8')); // Use the encoding necessary
    } catch (e) {
        return cloneDeep(baseCatalog);
    }
}

async function putProduct({ item, id, productId }) {
    item.id = productId;
    await validate(item);
    const catalog = await loadCatalog({ id });
    const products = catalog.products;
    const index = products.findIndex((el) => el.id === productId);
    if (index === -1) {
        throw CustomError('Not found', 404);
    } else {
        products[index] = item;
        await updateCatalog({ id, catalog });
        return item;
    }
}

async function postProduct({ item, id }) {
    const catalog = await loadCatalog({ id });
    item.id = OrderedUUID.generate();
    await validate(item);
    catalog.products.push(item);
    await updateCatalog({ id, catalog });
    return item;
}

async function listProducts({ id }) {
    const catalog = await loadCatalog({ id });
    return catalog.products;
}

async function imageUrl({ id }) {
    const Bucket = PUBLIC_BUCKET;
    const file = OrderedUUID.generate();
    const Key = `static/shops/${ id }/images/${ file }.jpeg`;
    const ContentType = 'image/jpeg';
    const Expires = 3600;
    const ACL = 'public';
    return s3.getSignedUrl('putObject', { Bucket, Key, Expires, ContentType, ACL});
}

module.exports.get = getProduct;

module.exports.put = putProduct;

module.exports.post = postProduct;

module.exports.del = deleteProduct;

module.exports.imageUrl = imageUrl;

module.exports.list = listProducts;

module.exports.getCatalog = loadCatalog;
