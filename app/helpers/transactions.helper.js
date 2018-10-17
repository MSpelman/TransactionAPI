const mongoose = require('mongoose');
const Transaction = mongoose.model('Transaction');

const DAY_TIME = 86400000;  // ms in a day

/**
 * Parameters: 
 *          name - Transaction name
 * Action: Extracts the company name from the transaction name
 * Returns: The company name
 */
const getCompany = function(name) {
    var nameArray = name.trim().split(" ");
    var company = nameArray[0];  // always include first piece for cases like '9th Ave Diner'
    for (var i = 1; i < nameArray.length; i++) {
        // this will mess up names like 'Henry's on 12th", but need to catch things like 'Netflix 23XAB'
        if (/^.*\d+.*$/.test(nameArray[i])) {
            break;  // once find number, break out
        } else {
            company += " " + nameArray[i];
        }
    }
    return company;
}

/**
 * Parameters: 
 *          groupAmt - Average amount for the transaction group
 *          txnAmt - Amount for the current transaction
 * Action: Compares the amount of the current transaction to see if it is similar
 *         to the group amount.  The amounts need to be within 25% to be considered
 *         similar.
 * Returns: Boolean indicating whether not the amounts are similar
 */
const similarAmounts = function(groupAmt, txnAmt) {
    if (txnAmt === groupAmt) return true;  // if same amount, no need to calculate ranges
    if (((txnAmt > 0) && (groupAmt < 0)) || ((txnAmt < 0) && (groupAmt > 0))) return false;  // one a debit, other a credit
    var offset = Math.abs(groupAmt * 0.25);
    return ((txnAmt > (groupAmt - offset)) && (txnAmt < (groupAmt + offset)));
}

/**
 * Parameters: 
 *          group - The transaction group the current transaction is being compared with
 *          txnDate - The current transactions date
 * Action: Compares the date of the current transaction to see if it is within the
 *         expected date range based on the transaction group's recurrence.
 * Returns: Boolean indicating whether not the transaction matches the group's recurrence
 */
const similarDates = function(group, txnDate) {
    var similar = false;

    if (group.recurrence === null) {
        // have not yet determined recurrence for group; currently only has one transaction
        // looping through dates in reverse chronological order: group.last_date always >= txnDate
        // this does not take things like DST into consideration, but okay since dealing with range
        var difDays = Math.floor((group.last_date.getTime() - txnDate.getTime()) / DAY_TIME);
        // need to check all possible recurrences
        switch (difDays) {
            // weekly
            case 5: case 6: case 7: case 8: case 9:
            group.recurrence = "WEEK";
            var nextTime = group.last_date.getTime() + (7 * DAY_TIME);
            var nextDate = new Date();
            nextDate.setTime(nextTime);
            group.next_date = nextDate.toISOString();
            similar = true;
            break;

            // bi-weekly (some people get paid bi-weekly)
            case 12: case 13: case 14: case 15: case 16:
            group.recurrence = "BIWK";
            var nextTime = group.last_date.getTime() + (14 * DAY_TIME);
            var nextDate = new Date();
            nextDate.setTime(nextTime);
            group.next_date = nextDate.toISOString();
            similar = true;
            break;

            // monthly (allow a bigger range because of things like February)
            case 26: case 27: case 28: case 29: case 30: case 31: case 32: case 33: case 34:
            group.recurrence = "MONT";
            var nextTime = group.last_date.getTime() + (30 * DAY_TIME);
            var nextDate = new Date();
            nextDate.setTime(nextTime);
            group.next_date = nextDate.toISOString();
            similar = true;
            break;

            // can add in checks for things like bi-monthly, quarterly, etc.

            // semi-annual (many times things like car insurance is billed every 6 months)
            case 179: case 180: case 181: case 182: case 183: case 184: case 185: case 186: case 187:
            group.recurrence = "SEMI";
            var nextTime = group.last_date.getTime() + (183 * DAY_TIME);
            var nextDate = new Date();
            nextDate.setTime(nextTime);
            group.next_date = nextDate.toISOString();
            similar = true;
            break;

            // annual
            case 360: case 362: case 363: case 364: case 365: case 366: case 367: case 368: case 369:
            group.recurrence = "YEAR";
            var nextTime = group.last_date.getTime() + (365 * DAY_TIME);
            var nextDate = new Date();
            nextDate.setTime(nextTime);
            group.next_date = nextDate.toISOString();
            similar = true;
            break;
        }
    } else {
        // just need to check recurrence specified in group
        var offset;
        var expectedTime;
        switch(group.recurrence) {
            case "WEEK":
            offset = 2 * DAY_TIME;
            expectedTime = group.last_date.getTime() - (7 * DAY_TIME);
            break;

            case "BIWK":
            offset = 2 * DAY_TIME;
            expectedTime = group.last_date.getTime() - (14 * DAY_TIME);
            break;

            case "MONT":
            offset = 4 * DAY_TIME;
            expectedTime = group.last_date.getTime() - (30 * DAY_TIME);
            break;

            case "SEMI":
            offset = 4 * DAY_TIME;
            expectedTime = group.last_date.getTime() - (183 * DAY_TIME);
            break;

            case "YEAR":
            offset = 4 * DAY_TIME;
            expectedTime = group.last_date.getTime() - (365 * DAY_TIME);
            break;
        }
        var txnTime = txnDate.getTime();
        if ((txnTime > (expectedTime - offset)) && (txnTime < (expectedTime + offset))) {
            similar = true;
        }
    }
    return similar;
}

/**
 * Parameters: 
 *          group - The transaction group the current transaction is being added to
 *          newAmt - Amount for the current transaction
 * Action: Updates the groups average amount so it includes the new transaction
 * Returns: None
 */
const updateNextAmt = function(group, newAmt) {
    var oldNum = group.transactions.length;
    var oldAmt = group.next_amt;
    group.next_amt = ((oldAmt * oldNum) + newAmt) / (oldNum + 1);
}

/**
 * Parameters: 
 *          txns - The transactions to process before bulk insertion
 * Action: Populates the company name
 * Returns: validation errors
 */
exports.preprocessTxns = function(txns) {
    if ((txns == null) || (txns.length === 0)) return {errors: "Empty transaction list"};
    // can do other preprocessing here, but remember model is responsible for validation in MVC
    for (var i = 0; i < txns.length; i++) {
        var txn = txns[i];
        txn.company = getCompany(txn.name);
        // the @meanie/mongoose-upsert-many documentation states schema validation is applied
        // but my testing says that it isn't... so I have to do it here
        var transaction = new Transaction(txn);
        err = transaction.validateSync();
        if (err) break;
    }
    return err;
}

/**
 * Parameters: 
 *          txns - The transactions to sort and determine the recurrence of
 * Action: Sorts the users transactions and determines if they are active and recurring.
 *         Note that the transactions will already be sorted by company, date(DESC), and amount
 * Returns: Array of active, recurring transactions
 */
exports.sortTxns = function(txns) {
    var recurTxns = [];  // return value; array of active recurring transactions
    var currentCompany;
    var companyGroups = [];  // Potential recurring groups for the current company
    txns.forEach((txn) => {
        if (txn.company !== currentCompany) {
            // switching to new company; add any active recurring groups 
            // for the previous company to return array
            companyGroups.forEach((group) => {
                if (group.transactions.length > 1) {
                    delete group.recurrence;
                    delete group.last_date;
                    recurTxns.push(group);
                }
            });
            // reset current company and their groups
            // sorted in descending date order, so first txn in group is most recent
            currentCompany = txn.company;
            companyGroups = [];
            var firstGroup = {
                name: txn.name,
                user_id: txn.user_id,
                next_amt: txn.amount,
                next_date: null,
                recurrence: null,
                last_date: txn.date,
                transactions: [txn]
            };
            companyGroups.push(firstGroup);
        } else {
            // which companyGroup does txn belong in (or create new)
            var found = false;
            for (let i = 0; i < companyGroups.length; i++) {
                var companyGroup = companyGroups[i];
                // already know user and company match; just need to check amount and date
                if (!similarAmounts(companyGroup.next_amt, txn.amount)) continue;
                if (!similarDates(companyGroup, txn.date)) continue;
                // matches exisiting group
                found = true;
                companyGroup.last_date = txn.date;
                // Skip adding txn if recurrence group is not active (w/ 4 day grace period).
                // Instead of hardcoding to Date.now, could have date to check against be a 
                // parameter.  Check needs to be done here because the recurrence needs to
                // be known before determining if a group is no longer active.
                var nextDate = new Date(companyGroup.next_date);
                var today = new Date();
                if (nextDate.getTime() > (today.getTime() - (4 * DAY_TIME))) {
                    updateNextAmt(companyGroup, txn.amount);
                    companyGroup.transactions.push(txn);
                }
                break;
            }
            // does not match existing group; create new
            if (!found) {
                var newGroup = {
                    name: txn.name,
                    user_id: txn.user_id,
                    next_amt: txn.amount,
                    next_date: null,
                    recurrence: null,
                    last_date: txn.date,
                    transactions: [txn]
                };
                companyGroups.push(newGroup);
            }
        }
    });
    // handle groups for last company
    companyGroups.forEach((group) => {
        if (group.transactions.length > 1) {
            delete group.recurrence;
            delete group.last_date;
            recurTxns.push(group);
        }
    });

    return recurTxns;
}