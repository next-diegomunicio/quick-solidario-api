const fs = require('fs');
const getUrls = require('get-urls');

const file = '/codebuild/output/tmp/deploy.out';
process.env.apiUrl = getDeployUrl();
process.env.ciTesting = 1;
require('jest-cli/bin/jest');



function getDeployUrl () {
    const text = fs.readFileSync(file, 'utf8');
    const urls = getUrls(text);
    for (let url of urls.values()) {
        if (url.includes('.execute-api.')) {
            const parts = url.split('/');
            parts.splice(4,100);
            let result = parts.join('/');
            if (result.endsWith('/') === false) {
                result += '/';
            }
            return result;
        }
    }
    process.exit(1);
}