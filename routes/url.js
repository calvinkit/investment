var router = require('express').Router();
var https = require('follow-redirects').https;
var httpProxyAgent = require('http-proxy-agent');
var httpsProxyAgent = require('https-proxy-agent');
var httpsProxy = process.env.HTTP_PROXY?new httpsProxyAgent(process.env.HTTP_PROXY):null;
var httpProxy = process.env.HTTP_PROXY?new httpProxyAgent(process.env.HTTP_PROXY):null;
var parse = require('url-parse');

router.get('/', function(req, response, next) {
    var url = parse(req.query.link, true);
    var options = { host: url.host,
                    headers: { Host: url.host },
                    agent: httpsProxy,
                    path: url.pathname };

    https.get(options, (res) => {
        res.setEncoding();
        res.on('data', (chunk) => { response.write(chunk); });
        res.on('error', (err) => { throw err; });
        res.on('end', () => {
            try { response.end(); next(); } catch(err) { throw err }
        });
    });
});

module.exports = router;
