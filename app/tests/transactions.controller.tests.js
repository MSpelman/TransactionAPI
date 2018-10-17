const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const chai = require('chai');
const expect = chai.expect;
const app = express();

describe('Transactions Controller Unit Tests:', () => {
    beforeEach((done) => {
        var transaction1 = new Transaction({
            trans_id: '123',
            user_id: 'dberg',
            name: 'Amazon 180815',
            amount: 12.99,
            date: '2018-08-15T08:00:00Z',
            company: 'Amazon'
        });

        var transaction2 = new Transaction({
            trans_id: '124',
            user_id: 'dberg',
            name: 'Amazon 180915',
            amount: 12.99,
            date: "2018-09-15T08:00:00Z",
            company: 'Amazon'
        });

        transaction1.save(() => {
            transaction2.save(() => {
                done();
            });
        });
    });

    describe('Testing PUT on root: transactions.controller.upsert', () => {
        it('Should return a group of monthly recurring transactions (single new txn upserted)', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"125",
                        "user_id":"dberg",
                        "name":"Amazon 181015",
                        "amount":"12.99",
                        "date":"2018-10-15T08:00:00.000Z"
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.a('array');
                    expect(res.body).has.lengthOf(1);
                    expect(res.body[0]).to.have.property('name').that.equals('Amazon 181015');
                    expect(res.body[0]).to.have.property('user_id').that.equals('dberg');
                    expect(res.body[0]).to.have.property('next_amt').that.equals(12.99);
                    expect(res.body[0]).to.have.property('next_date').that.equals('2018-11-14T08:00:00.000Z');
                    var txns = res.body[0].transactions;
                    expect(txns).to.be.a('array');
                    expect(txns).has.lengthOf(3);
                    done();
                });
        });

        it('Should return multiple recurring transactions (multiple txns upserted)', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"126",
                        "user_id":"dberg",
                        "name":"AAA Txn",
                        "amount":"-100",
                        "date":"2018-10-17T08:00:00.000Z"
                    },
                    {
                        "trans_id":"127",
                        "user_id":"dberg",
                        "name":"AAA Txn",
                        "amount":"-101",
                        "date":"2018-10-24T08:00:00.000Z"
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.a('array');
                    expect(res.body).has.lengthOf(2);
                    expect(res.body[0]).to.have.property('name').that.equals('AAA Txn');
                    expect(res.body[0]).to.have.property('user_id').that.equals('dberg');
                    expect(res.body[0]).to.have.property('next_amt').that.equals(-100.5);
                    expect(res.body[0]).to.have.property('next_date').that.equals('2018-10-31T08:00:00.000Z');
                    var txns = res.body[0].transactions;
                    expect(txns).to.be.a('array');
                    expect(txns).has.lengthOf(2);
                    done();
                });
        });

        it('Should return a status of 400 (empty request)', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                ])
                .expect('Content-Type', /json/)
                .expect(400, done);
        });

        it('Should return a status of 400 (invalid data)', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"125",
                        "name":"Amazon 181015",
                        "amount":"12.99",
                        "date":"2018-10-15T08:00:00.000Z"
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(400, done);
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

    after((done) => {
        Transaction.deleteMany({}, () => {
            done();
        });
    });
});