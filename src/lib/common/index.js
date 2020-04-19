const xss = require('xss');

module.exports.sanitizeSlug = (string = '') => {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõőṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnoooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return string.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
};

function xssObject(item) {
    const type = typeof item;
    if (type === 'object') {
        if (Array.isArray(item)) {
            item.forEach((el, index) => {
               item[index] = xssObject(el);
            });
            return item;
        } else {
            const keys = Object.keys(item);
            keys.forEach((k) => {
                const value = item[k];
                item[k] = xssObject(value);
            });
            return item;
        }
    } else if (type === 'string') {
        return xss(item);
    } else {
        return item;
    }
}

module.exports.xss = xssObject;
