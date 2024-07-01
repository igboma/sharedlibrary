//process.env = 
const db = require('../database/db');
const path = require('path');
const async = require('async')

async.waterfall([
    function (callback) {
        db.initializeDB({ dbName: 'order_management' }, function () {
            callback();
        });
    }, function (callback) {
        db.loadTables(path.resolve('./tests/mydb'), function () {
            console.log('The end');
            callback();
        })
    }], function () {
        console.log('Finish');
    })


// db.delay(function () {
//     console.log('The end of delay')
// })