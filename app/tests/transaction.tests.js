const app = require('../../app');
const chai = require('chai');
const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');

let transaction;
const expect = chai.expect;

describe('Transaction Model Unit Tests:', () => {
    beforeEach((done) => {
        transaction = new Transaction({
            trans_id: '123',
            user_id: 'user1',
            name: 'Amazon 181015',
            amount: 12.99,
            date: "2018-10-15T08:00:00Z",
            company: 'Amazon'
        })

        done();
    });

    describe('Testing save()', () => {
        it('Should be able to save', () => {
            transaction.save((err) => {
                expect(err).to.not.exist;
            });
        });
        it('Should not save a transaction with no trans_id', () => {
            transaction.trans_id = '';
            transaction.save((err) => {
                expect(err).to.exist;
            })
        })
    });

    afterEach((done) => {
        Transaction.remove(() => {
            done();
        });
    });
});