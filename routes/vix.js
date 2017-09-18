var router = require('express').Router();

router.get('/term', function(req, res, next) {
    var date = req.query.date;
        //db.all("SELECT * FROM Futures WHERE Date=? ORDER BY ContractDate ASC", new Date(date).getTime(), function(err, rows) {
        //    socket.emit('vix term structure', rows);
        //    });
});

router.get('/futures', function(req, res, next) {
    var contract = req.query.contract;
        //db.all("SELECT * FROM Futures WHERE Contract=? ORDER BY Date ASC", contract, function(err, rows) {
        //    socket.emit('vix futures', rows);
        //    });
});

module.exports = router;
