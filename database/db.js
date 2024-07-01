const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const knex = require('knex');
const async = require('async');
const dbTable = require('./datatable/table');
const standardFields = require('./datatable/standardfields');

//let db;
let dbOption;

const databaseConfig = {
    client: process.env.DB_TYPE || 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'cm_user',
        password: process.env.DB_PASS || 'dbpass123',
        database: process.env.DB_NAME || 'cm_user_access_mg',
        port: 5432,
    },
    pool: { min: 2, max: 10 },
};

function initializeDB(options, done) {
    //console.log('initializeDB ==>', options);
    dbOption = options;
    if (options.dbName) {
        databaseConfig.connection.database = options.dbName;
    }

    const tempDbConfig = _.cloneDeep(databaseConfig);
    tempDbConfig.connection.database = 'postgres';
    //console.log('tempDbConfig ==>', tempDbConfig);
    //console.log('databaseConfig ==>', databaseConfig);

    const tempDb = knex(tempDbConfig);

    async.waterfall([
        function (callback) {
            tempDb.raw(`SELECT 1 FROM pg_database WHERE datname = ?`, [options.dbName])
                .asCallback((error, result) => {
                    if (error) {
                        console.error('Error checking database existence:', error);
                        tempDb.destroy();
                        return callback(error);
                    }
                    //console.log('Result.rows:', result.rows);
                    callback(null, result)
                });
        },
        function (result, callback) {
            if (result.rows.length === 0) {
                tempDb.raw(`CREATE DATABASE ??`, [options.dbName])
                    .asCallback((createError) => {
                        tempDb.destroy();
                        if (createError) {
                            console.error('Error creating database:', createError);
                            return callback(createError);
                        }
                        // db = knex(databaseConfig);
                        callback();
                    });
            } else {
                tempDb.destroy();
                callback();
            }
        }
    ], function () {
        done()
    });
}

function getDBKnex() {
    if (dbOption.dbName) {
        databaseConfig.connection.database = dbOption.dbName;
    }
    const tempDb = knex(databaseConfig);
    return tempDb;
}
function loadTables(schemaPath, done) {
    let db = getDBKnex();
    const tables = fs.readdirSync(schemaPath);

    async.eachSeries(tables, (tableName, eachCallback) => {
        const tablePath = path.join(schemaPath, tableName);
        const tableDefinition = require(path.join(tablePath, 'index.js'));

        db.schema.hasTable(tableName)
            .then((exists) => {
                if (!exists) {
                    db.schema.createTable(tableName, (table) => {
                        createColumns(table, tableDefinition.columns);
                    })
                        .then(() => {
                            eachCallback();
                        })
                        .catch((error) => {
                            console.error(`Error creating table ${tableName}:`, error);
                            eachCallback(error);
                        });
                } else {
                    updateTableColumns(db, tableName, tableDefinition.columns, eachCallback);
                }
            })
            .catch((error) => {
                console.error(`Error checking table ${tableName} existence:`, error);
                eachCallback(error);
            });
    }, (error) => {
        closeConnection(db, function () {
            if (error) {
                console.error('Error loading tables:', error);
                done(error);
            } else {
                console.log('All tables loaded successfully.');
                done();
            }
        })
    });
}

// function createColumns(table, columns) {
//     for (const [columnName, columnInfo] of Object.entries(columns)) {
//         const column = table[columnInfo.type](columnName);
//         if (columnInfo.notNullable) column.notNullable();
//         if (columnInfo.defaultTo !== undefined) column.defaultTo(columnInfo.defaultTo);
//     }
// }

function createColumns(table, columns) {
    // Merge standard fields with table-specific columns
    const allColumns = _.cloneDeep(standardFields.columns);

    var keys = _.keys(columns);
    _.each(keys, function (key) {
        if (!allColumns[key]) {
            allColumns[key] = columns[key]
        }
    });

    console.log('allColumns ==>', allColumns);

    for (const [columnName, columnInfo] of Object.entries(allColumns)) {
        // Check if the column is already defined in table-specific columns
        // if (columns && columns[columnName]) {
        //     continue; // Skip this column as it's defined in table-specific columns
        // }

        let column;
        switch (columnInfo.type) {
            case 'uuid':
                column = table.uuid(columnName);
                break;
            case 'timestamptz':
                column = table.datetime(columnName, { precision: 6, useTz: true });
                break;
            case 'integer':
                column = table.integer(columnName);
                break;
            case 'string':
                column = table.string(columnName);
                break;
            default:
                throw new Error(`Unsupported column type: ${columnInfo.type}`);
        }

        if (columnInfo.primary) {
            column.primary();
        }
        if (columnInfo.notNullable) {
            column.notNullable();
        }
        if (columnInfo.defaultTo !== undefined) {
            if (typeof columnInfo.defaultTo === 'function') {
                column.defaultTo(columnInfo.defaultTo(table));
            } else {
                column.defaultTo(columnInfo.defaultTo);
            }
        }
    }
}

function updateTableColumns(db, tableName, newColumns, callback) {

    db(tableName).columnInfo()
        .asCallback((error, existingColumns) => {
            if (error) {
                console.error(`Error fetching column information for table ${tableName}:`, error);
                return callback(error);
            }

            const columnsToUpdate = Object.entries(newColumns).filter(
                ([columnName]) => !existingColumns[columnName]
            );

            if (columnsToUpdate.length === 0) {
                return callback();
            }

            db.schema.table(tableName, (table) => {
                columnsToUpdate.forEach(([columnName, columnInfo]) => {
                    const column = table[columnInfo.type](columnName);
                    if (columnInfo.notNullable) column.notNullable();
                    if (columnInfo.defaultTo !== undefined) column.defaultTo(columnInfo.defaultTo);
                });
            })
                .asCallback(callback);
        });
}

function closeConnection(db, callback) {
    db.destroy()
        .then(() => {
            console.log('Database connection closed.');
            callback();
        })
        .catch((error) => {
            console.error('Error closing database connection:', error);
            callback(error);
        });
}

const dbHelper = {
    initializeDB,
    loadTables,
    closeConnection,
    getDBKnex,
    getTable(options, callback) {
        // Implement the getTable functionality here
    },
    execute(options, callback) {
        let db = getDBKnex();
        if (options.commandName) {
            switch (options.commandName) {
                case 'load':
                    dbTable.load(db, options, callback);
                    break;
                case 'list':
                    dbTable.list(db, options, callback);
                    break;
                case 'update':
                    dbTable.update(db, options, callback);
                    break;
                case 'insert':
                    dbTable.insert(db, options, callback);
                    break;
                case 'del':
                    dbTable.del(db, options, callback);
                    break;
                case 'raw':
                    dbTable.raw(db, options, callback);
                    break;
                default:
                    callback(new Error('Invalid command name'));
            }
        } else {
            callback(new Error('No command name provided'));
        }
    },
};

module.exports = dbHelper;
