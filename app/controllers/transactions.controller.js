const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const txnHelper = require('../helpers/transactions.helper');

/**
 * POST "/"
 * Input: array of transactions from request
 * Action: Bulk upsert of transactions to database
 * Output: None
 */
exports.upsert = function(req, res, next) {
    var txns = req.body;
    var valErr;

    valErr = txnHelper.preprocessTxns(txns, req.user);
    if (valErr) return res.status(400).send(valErr);

    Transaction.upsertMany(req.body, ['trans_id']).then((result) => {
        next();
    }, (err) => {
        return res.status(400).send(err);
    });
}

/**
 * GET "/"
 * Input: None
 * Action: Looks up authenticated user's transactions and determines 
 *         which are active and recurring
 * Output: Array of active, recurring transactions
 */
exports.recurring = function(req, res, next) {
    Transaction.find({user_id: req.user})
    .sort('company -date')
    .exec((err, txns) => {
        if (err) {
            return res.status(400).send(err);
        } else {
            const recurTxns = txnHelper.sortTxns(txns);
            res.status(200).json(recurTxns);
        }
    });
}

/**
 * Input: None
 * Action: Mimics a session with an authenticated user
 * Output: Sets req.user
 */
exports.fakeSession = function(req, res, next) {
    req.user = {
        _id:  'dberg',
        name: 'Dana Bergkamp'
    };
    next();
}