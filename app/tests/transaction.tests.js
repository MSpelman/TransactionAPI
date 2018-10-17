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
            user_id: 'dberg',
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
            });
        });

        it('Should not save a transaction with no user_id', () => {
            transaction.user_id = '';
            transaction.save((err) => {
                expect(err).to.exist;
            });
        });

        it('Should not save a transaction with no name', () => {
            transaction.name = '';
            transaction.save((err) => {
                expect(err).to.exist;
            });
        });

        it('Should not save a transaction with no amount', () => {
            transaction.amount = '';
            transaction.save((err) => {
                expect(err).to.exist;
            });
        });
    });

    afterEach((done) => {
        Transaction.deleteMany({}, () => {
            done();
        });
    });
});