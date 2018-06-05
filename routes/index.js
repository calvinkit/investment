var express = require('express');
var router = express.Router();
var users = require('../users');
var logger = require('../config/log');
var SectorAnalysis = require('../sector_analysis');

/* GET home page. */
router.get('/sectoranalysis', function(req, res, next) {
    var analysis = new SectorAnalysis();
    analysis.handle.bind({ res: res, country: req.query.country, sector: req.query.sector, indexed: req.query.indexed })();
});

router.get('/', function(req, res, next) {
    var ip = req.connection.remoteAddress;
    if (users[ip] == "Calvin1") {
        res.header('Cache-Control', 'no-cache'); res.render('calvin', { title: 'Express' }); next();
    } else {
        logger.log('info','Rejected Connection: '+ip+' @ '+new Date().toLocaleTimeString());
        res.header('Cache-Control', 'no-cache'); res.render('index', { title: 'Express' });
        return;
    }
});

module.exports = router;
