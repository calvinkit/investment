var express = require('express');
var router = express.Router();
var SectorAnalysis = require('../sector_analysis');

/* GET home page. */
router.get('/sectoranalysis', function(req, res, next) {
    var analysis = new SectorAnalysis();
    analysis.handle.bind({ res: res, country: req.query.country, sector: req.query.sector, indexed: req.query.indexed })();
});

router.get('/', function(req, res, next) {
    if (true)  {
        res.render('index', { title: 'Express' });
        next();
    } else {
        res.render('login', { title: 'Login' });
    }
});

module.exports = router;
