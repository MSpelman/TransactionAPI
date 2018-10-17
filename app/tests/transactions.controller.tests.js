const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const app = express();

describe('Transactions Controller Unit Tests:', () => {
    beforeEach((done) => {
        var transaction1 = new Transaction({
            trans_id: '123',
            user_id: 'user1',
            name: 'Amazon 180915',
            amount: 12.99,
            date: '2018-09-15T08:00:00Z',
            company: 'Amazon'
        });

        var transaction2 = new Transaction({
            trans_id: '124',
            user_id: 'user1',
            name: 'Amazon 181015',
            amount: 12.99,
            date: "2018-10-15T08:00:00Z",
            company: 'Amazon'
        });

        transaction1.save(() => {
            transaction2.save(() => {
                done();
            });
        });
    });

    describe('Testing PUT on root: transactions.controller.upsert', () => {
        it('Should return the list of recurring transactions', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"125",
                        "user_id":"user1",
                        "name":"Amazon 180915",
                        "amount":"12.99",
                        "date":"2018-09-15T08:00:00.000Z"
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    done();
                });
        });
    });

    describe('Testing GET on root: transactions.controller.recurring', () => {
        it('Should return the list of recurring transactions', (done) => {
            request('http://localhost:1984').get('/')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    done();
                });
        });
    });

    afterEach((done) => {
        Transaction.remove(() => {
            done();
        });
    });
});