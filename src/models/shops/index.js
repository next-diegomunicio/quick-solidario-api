require('module-alias/register');
const dynamo = require('dynamodb');
const app = require('app');
const Joi = require('joi');
const { cloneDeep } = require('lodash');
const AWS = require('aws-sdk');
const { sanitizeSlug } = require('lib/common');
const region = process.env.REGION;
const tableShops = process.env.TABLE_SHOPS;
const tablePendingShops = process.env.TABLE_SHOPS_PENDING;
const PUBLIC_BUCKET = process.env.BUCKET_PUBLIC;
const CustomError = app.error;
const s3 = new AWS.S3();
const validCountries = ['es', 'mx']; //TODO llevar a configs o S3 y map
const validCategories = ['food', 'fruit']; //TODO llevar a configs o a S3 y map Son los slugs de las categorías
const validCurrencies = ['euro', 'mxn'];
const validPayments = ['money']; //TODO llevar a configs o S3 y map
const CONFIG_CACHE = 900; // seconds
const validThemes = ['default'];
const PENDING_PREFIX = '_tmp_';

dynamo.AWS.config.update({ region });

//TODO encriptar y crear tabla en cloudformation
const baseShop = {
    hashKey : 'id',
    tableName: tableShops,
    schema : {
        id: Joi.string().required(),
        country : Joi.string().required().allow(validCountries),
        cp: Joi.number().required(),
        address: Joi.string().required(),
        details: Joi.string(),
        phone : Joi.number().required(),
        email: Joi.string().email().required(),
        adminId: Joi.string().required(),
        categories: dynamo.types.stringSet(),
        title: Joi.string().required(),
        description: Joi.string().required(),
        currency: Joi.string().required().allow(validCurrencies),
        payment: dynamo.types.stringSet(),
        theme: Joi.string().required().allow(validThemes),
    },
    indexes : [{
        hashKey : 'country',
        rangeKey: 'cp',
        name : 'cnIn',
        type : 'global'
    }]
};

const Shop = dynamo.define(tableShops, cloneDeep(baseShop));
const pendingT = cloneDeep(baseShop);
pendingT.tableName = tablePendingShops;
const PendingShop = dynamo.define(tablePendingShops, pendingT);

async function deleteShop({ id  }) {
    return new Promise((resolve, reject) => {
        const Model = isPendingShop(id) ? PendingShop : Shop;
        Model.destroy(id, (err) => {
            return err ? reject(err) : resolve();
        });
    });
}

async function updatePublicConfig({ item, id }) {
    const data = cloneDeep(item);
    const Key = `static/shops/${ id }/config.json`;
    const Bucket = PUBLIC_BUCKET;
    const privateFields = ['adminId'];
    privateFields.forEach((field) => {
       delete data[field];
    });
    const params = {
        Bucket,
        Key,
        ACL: 'public-read',
        Body: JSON.stringify(data),
        CacheControl: `max-age=${ CONFIG_CACHE }`,
        ContentType: 'application/json'
    };
    await s3.putObject(params).promise();
}

function validateCategories(item) {
    const cats = item.categories || [];
    const res = [];
    cats.forEach((cat) => {
        if (validCategories.includes(cat) === false) {
            throw CustomError('Not valid category ' + cat, 412);
        } else {
            res.push(cat);
        }
    });
    item.categories = res;
}

function validatePayment(item) {
    const cats = item.payment || [];
    const res = [];
    cats.forEach((cat) => {
        if (validPayments.includes(cat) === false) {
            throw CustomError('Not valid payment ' + cat, 412);
        } else {
            res.push(cat);
        }
    });
    item.payment = res;
}

async function putShop({ item, id, create = false }) {
    return new Promise((resolve, reject) => {
        delete item.logo;
        const isPending = isPendingShop(id);
        const Model = isPending ? PendingShop : Shop;
        const fn = (create === true) ? 'create' : 'update';
        const fields = Object.keys(item);
        validateCategories(item);
        validatePayment(item);
        Model[fn](item, { overwrite: false }, async (err) => {
            if (err) {
                reject(err);
            } else if (isPending === false) {
                try {
                    await updatePublicConfig({ id, item });
                    resolve();
                } catch (e) {
                    reject(e);
                }

            } else {
                resolve();
            }
        });
    });
}

function getLogoKey(id) {
    return `static/shops/${ id }/logo.jpeg`;
}

function isPendingShop(id) {
    return id.startsWith(PENDING_PREFIX);
}

async function getShop({ id, fields = [] }) {
    return new Promise((resolve, reject) => {
        const Model = isPendingShop(id) ? PendingShop : Shop;
        const params = {};
        if (fields.length !== 0) {
            params.ProjectionExpression = fields.join(', ');
        }
        Model.get(id, params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                if (data !== null) {
                    data = data.toJSON();
                    data.logo = getLogoKey(id);
                }
                resolve(data);
            }
        });
    });
}

async function checkSlug ({ slug }) {
    const tmp_id = cleanSlug(slug.replace(PENDING_PREFIX, ''));
    const id = PENDING_PREFIX + tmp_id;
    const invalidSlugs = ['admin', 'products', 'bbva', 'bancomer'];
    const fields = ['id'];
    if (invalidSlugs.includes(tmp_id)) {
        return false;
    } else {
        const [a, b] = await Promise.all([
            getShop({ id: tmp_id, fields }),
            getShop({ id, fields })
        ]);
        return (a === null && b === null);
    }
}

function cleanSlug(slug = '') {
    //TODO funcion que sanitice el slug
    return sanitizeSlug(slug.trim());
}

// recupera tienda
module.exports.get = getShop;

// crea/actualiza tienda
module.exports.put = async ({ item, id }) => {
    item.id = id;
    return putShop({ item, create: false, id: item.id});
};

module.exports.post = async ({ item }) => {
    const slug = item.id;
    const isValid = await checkSlug({ slug });
    if (isValid === true) {
        item.id = PENDING_PREFIX + cleanSlug(slug);
        return putShop({ item, create: true, id: item.id});
    } else {
        throw CustomError('Invalid slug', 412);
    }
};

// borra tienda
module.exports.del = deleteShop;

// mueve de una tabla a otra y ¿notifica?
module.exports.activate = async ({ id }) => {
    if (isPendingShop(id) === true) {
        const item = await getShop({ id });
        if (item !== null) {
            item.id = cleanSlug(id.replace(PENDING_PREFIX, ''));
            return Promise.all([
                deleteShop({ id }),
                putShop({ item, id: item.id, create: true })
            ]);
        } else {
            throw app.error('Not found', 404);
        }
    } else {
        throw app.error('Bad Request', 400);
    }
};

// verifica en las dos tablas o blacklist si existe una tienda con ese slug
module.exports.checkSlug = checkSlug;

// genera url prefirmada para subir el logo
module.exports.logoUrl = async ({ id }) => {
    const Bucket = PUBLIC_BUCKET;
    const Key = getLogoKey(id);
    const ContentType = 'image/jpeg';
    const Expires = 3600;
    const ACL = 'public';
    return s3.getSignedUrl('putObject', { Bucket, Key, Expires, ContentType, ACL});
};

module.exports.list = async ({ country, cp = false, size = 20, start = false, pending = false, fields = [] }) => {
    return new Promise((resolve, reject) => {
        // TODO si fields no es [] sacamos lo que nos piden
        // TODO pensar posible búsqueda por categorías... q será que no
        const Model = (pending === true) ? PendingShop : Shop;
        const query = Model.query(country)
            .usingIndex('cnIn')
            .descending()
            .limit(size);
        if (start !== false) {
            query.startKey(start);
        }
        if (cp !== false) {
            query.where('cp').equals(parseInt(cp));
        }
        if (fields.length !== 0) {
            query.attributes(fields);
        }
        query.exec((err, data) => {
            if (err) {
                reject(err);
            } else {
                const items = data.Items || [];
                resolve(items.map((i) => {
                    const item = i.toJSON();
                    item.logo = getLogoKey(item.id);
                    return item;
                }));
            }
        });
    });
};

module.exports.isPendingShop = isPendingShop;
