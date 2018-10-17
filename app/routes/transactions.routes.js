const express = require('express');
const router = express.Router();
const transactionsCtlr = require('../controllers/transactions.controller');
const timeout = require('connect-timeout');

/**
 * Routes related to transactions
 * 
 * Note: the assumption is that there would be an authenticated user;
 * thus transactionCtlr.fakeSession adds in a value for req.user
 */
router.route('/')
    .get(transactionsCtlr.fakeSession, timeout('10s'), transactionsCtlr.recurring)
    .post(transactionsCtlr.fakeSession, timeout('10s'), transactionsCtlr.upsert, transactionsCtlr.recurring);

module.exports = router;