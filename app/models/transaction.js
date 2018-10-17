const mongoose = require('mongoose');
const upsertMany = require('@meanie/mongoose-upsert-many');
const Schema = mongoose.Schema;

/**
 * This is a simple validation function to prevent malicious data from getting stored
 * since I am not sure where it is coming from.  Depending on how trustworthy the data
 * source is and what we are doing with the data on the front end, we could add 
 * additional checks, an xss filter, etc.
 */
function textValidator(value) {
    const regEx = new RegExp(/[<>`"/:?()#;]/);
    return !regEx.test(value);
}

const TransactionSchema = new Schema({
    trans_id: {
        type: String,
        required: true,
        unique: true,
        validate: [textValidator, 'Invalid transaction id']
    },
    user_id: {
        type: String,
        required: true,
        index: true,
        validate: [textValidator, 'Invalid user id']
    },
    name: {
        type: String,
        trim: true,
        required: true,
        validate: [textValidator, 'Invalid name']
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    company: {
        type: String,
        required: true,
        validate: [textValidator, 'Invalid company']
    }
});

TransactionSchema.plugin(upsertMany);

mongoose.model('Transaction', TransactionSchema);