const config = require('./config');
const mongoose = require('mongoose');

module.exports = function() {
    const db = mongoose.connect(config.dbUri);

    require('../app/models/transaction');
    
    return db;
}