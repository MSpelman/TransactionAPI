const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');
const chai = require('chai');
const expect = chai.expect;
const app = express();

// would normally create a mock session
const loggedInUser = {
    _id:  'dberg',
    name: 'Dana Bergkamp'
};

// The functionality being tested is date dependent, since it returns active
// recurring transactions.  Thus the tests must use relative dates or they 
// will start failing due to the passage of time.
const DAY_TIME = 86400000;  // ms in a day
let TODAY, WEEK_AGO, ONE_MONTH_AGO, TWO_MONTH_AGO, WEEK_FROM_NOW, MONTH_FROM_NOW;
let TWO_WEEK_AGO, SIX_MONTH_AGO, ONE_YEAR_AGO, TWO_WEEK_FROM_NOW, SIX_MONTH_FROM_NOW;
let YEAR_FROM_NOW;

describe('Transactions Controller Unit Tests:', () => {
    before((done) => {
        var today = new Date();
        TODAY = today.toISOString();
        
        var weekAgo = new Date(today.getTime() - (7 * DAY_TIME));
        WEEK_AGO = weekAgo.toISOString();

        var twoWeekAgo = new Date(today.getTime() - (14 * DAY_TIME));
        TWO_WEEK_AGO = twoWeekAgo.toISOString();
        
        var monthAgo = new Date(today.getTime() - (30 * DAY_TIME));
        ONE_MONTH_AGO = monthAgo.toISOString();
        
        var twoAgo = new Date(today.getTime() - (60 * DAY_TIME));
        TWO_MONTH_AGO = twoAgo.toISOString();

        var sixMonthAgo = new Date(today.getTime() - (183 * DAY_TIME));
        SIX_MONTH_AGO = sixMonthAgo.toISOString();

        var yearAgo = new Date(today.getTime() - (365 * DAY_TIME));
        ONE_YEAR_AGO = yearAgo.toISOString();
        
        var weekFromNow = new Date(today.getTime() + (7 * DAY_TIME));
        WEEK_FROM_NOW = weekFromNow.toISOString();

        var twoWeekFromNow = new Date(today.getTime() + (14 * DAY_TIME));
        TWO_WEEK_FROM_NOW = twoWeekFromNow.toISOString();
        
        var monthFromNow = new Date(today.getTime() + (30 * DAY_TIME));
        MONTH_FROM_NOW = monthFromNow.toISOString();

        var sixMonthFromNow = new Date(today.getTime() + (183 * DAY_TIME));
        SIX_MONTH_FROM_NOW = sixMonthFromNow.toISOString();

        var yearFromNow = new Date(today.getTime() + (365 * DAY_TIME));
        YEAR_FROM_NOW = yearFromNow.toISOString();        

        done();
    });

    beforeEach((done) => {
        var transaction1 = new Transaction({
            trans_id: '123',
            user_id: loggedInUser._id,
            name: 'Amazon 180815',
            amount: 12.99,
            date: TWO_MONTH_AGO,
            company: 'Amazon'
        });

        var transaction2 = new Transaction({
            trans_id: '124',
            user_id: loggedInUser._id,
            name: 'Amazon 180915',
            amount: 12.99,
            date: ONE_MONTH_AGO,
            company: 'Amazon'
        });

        transaction1.save(() => {
            transaction2.save(() => {
                done();
            });
        });
    });

    describe('Testing POST on root: transactions.controller.upsert', () => {
        it('Should return a group of monthly recurring transactions (single new txn upserted)', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"125",
                        "user_id":loggedInUser._id,
                        "name":"Amazon 181015",
                        "amount":"12.99",
                        "date":TODAY
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.a('array');
                    expect(res.body).has.lengthOf(1);
                    expect(res.body[0]).to.have.property('name').that.equals('Amazon 181015');
                    expect(res.body[0]).to.have.property('user_id').that.equals(loggedInUser._id);
                    expect(res.body[0]).to.have.property('next_amt').that.equals(12.99);
                    expect(res.body[0]).to.have.property('next_date').that.equals(MONTH_FROM_NOW);
                    var txns = res.body[0].transactions;
                    expect(txns).to.be.a('array');
                    expect(txns).has.lengthOf(3);
                    done();
                });
        });

        it('Should update exisiting transaction (single txn updated)', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"125",
                        "user_id":loggedInUser._id,
                        "name":"Amazon 2",
                        "amount":"12.99",
                        "date":TODAY
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.a('array');
                    expect(res.body).has.lengthOf(1);
                    expect(res.body[0]).to.have.property('name').that.equals('Amazon 2');
                    var txns = res.body[0].transactions;
                    expect(txns).to.be.a('array');
                    expect(txns).has.lengthOf(3);
                    expect(txns[0]).to.have.property('trans_id').that.equals('125');
                    expect(txns[0]).to.have.property('name').that.equals('Amazon 2');
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
                        "user_id":loggedInUser._id,
                        "name":"AAA Txn",
                        "amount":"-100",
                        "date":WEEK_AGO
                    },
                    {
                        "trans_id":"127",
                        "user_id":loggedInUser._id,
                        "name":"AAA Txn",
                        "amount":"-101",
                        "date":TODAY
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.a('array');
                    expect(res.body).has.lengthOf(2);
                    expect(res.body[0]).to.have.property('name').that.equals('AAA Txn');
                    expect(res.body[0]).to.have.property('user_id').that.equals(loggedInUser._id);
                    expect(res.body[0]).to.have.property('next_amt').that.equals(-100.5);
                    expect(res.body[0]).to.have.property('next_date').that.equals(WEEK_FROM_NOW);
                    var txns = res.body[0].transactions;
                    expect(txns).to.be.a('array');
                    expect(txns).has.lengthOf(2);
                    done();
                });
        });

        it('Should not include in-active recurring transactions', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"128",
                        "user_id":loggedInUser._id,
                        "name":"A Stale Txn",
                        "amount":"100",
                        "date":"2017-08-18T08:00:00.000Z"
                    },
                    {
                        "trans_id":"129",
                        "user_id":loggedInUser._id,
                        "name":"A Stale Txn",
                        "amount":"100",
                        "date":"2017-09-18T08:00:00.000Z"
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.a('array');
                    expect(res.body).has.lengthOf(2);
                    expect(res.body[0]).to.have.property('name').that.equals('AAA Txn');
                    expect(res.body[0]).to.have.property('user_id').that.equals(loggedInUser._id);
                    expect(res.body[0]).to.have.property('next_amt').that.equals(-100.5);
                    expect(res.body[0]).to.have.property('next_date').that.equals(WEEK_FROM_NOW);
                    var txns = res.body[0].transactions;
                    expect(txns).to.be.a('array');
                    expect(txns).has.lengthOf(2);
                    done();
                });
        });

        it('Should return a group of recurring transactions for each recurrence pattern', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"130",
                        "user_id":loggedInUser._id,
                        "name":"BIWK Txn",
                        "amount":"100",
                        "date":TWO_WEEK_AGO
                    },
                    {
                        "trans_id":"131",
                        "user_id":loggedInUser._id,
                        "name":"BIWK Txn",
                        "amount":"101",
                        "date":TODAY
                    },
                    {
                        "trans_id":"132",
                        "user_id":loggedInUser._id,
                        "name":"SEMI Txn",
                        "amount":"100",
                        "date":SIX_MONTH_AGO
                    },
                    {
                        "trans_id":"133",
                        "user_id":loggedInUser._id,
                        "name":"SEMI Txn",
                        "amount":"101",
                        "date":TODAY
                    },
                    {
                        "trans_id":"134",
                        "user_id":loggedInUser._id,
                        "name":"YEAR Txn",
                        "amount":"100",
                        "date":ONE_YEAR_AGO
                    },
                    {
                        "trans_id":"135",
                        "user_id":loggedInUser._id,
                        "name":"YEAR Txn",
                        "amount":"101",
                        "date":TODAY
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(200)
                .end((err, res) => {
                    if (err) return done(err);
                    expect(res.body).to.be.a('array');
                    expect(res.body).has.lengthOf(5);
                    expect(res.body[2]).to.have.property('name').that.equals('BIWK Txn');
                    expect(res.body[2]).to.have.property('next_date').that.equals(TWO_WEEK_FROM_NOW);
                    expect(res.body[3]).to.have.property('name').that.equals('SEMI Txn');
                    expect(res.body[3]).to.have.property('next_date').that.equals(SIX_MONTH_FROM_NOW);
                    expect(res.body[4]).to.have.property('name').that.equals('YEAR Txn');
                    expect(res.body[4]).to.have.property('next_date').that.equals(YEAR_FROM_NOW);
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
                        "trans_id":"136",
                        "name":"Amazon 181015",
                        "amount":"12.99",
                        "date":TODAY
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(400, done);
        });

        it('Should return a status of 400 (user_id does not match authenticated user)', (done) => {
            request('http://localhost:1984').post('/')
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .send([
                    {
                        "trans_id":"137",
                        "user_id":"notauthenticateduser",
                        "name":"Amazon 181015",
                        "amount":"12.99",
                        "date":TODAY
                    }
                ])
                .expect('Content-Type', /json/)
                .expect(400)
                .end((err, res) => {
                    expect(res.body).to.have.property('errors').that.equals('Forbidden!');
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

    after((done) => {
        Transaction.deleteMany({}, () => {
            done();
        });
    });
});