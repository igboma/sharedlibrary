const dbTable = {
    load(db, options, callback) {
      // Implement the 'load' operation
      db(options.tableName)
        .select()
        .where(options.conditions)
        .asCallback(callback);
    },
  
    list(db, options, callback) {
        const { tableName, page, pageSize } = options;
        const offset = (page - 1) * pageSize;
    
        db(tableName)
          .select()
          .offset(offset)
          .limit(pageSize)
          .asCallback(callback);
      },
  
    update(db, options, callback) {
      // Implement the 'update' operation
      db(options.tableName)
        .where(options.conditions)
        .update(options.updates)
        .asCallback(callback);
    },
  
    insert(db, options, callback) {
      // Implement the 'insert' operation
      db(options.tableName)
        .insert(options.data)
        .asCallback(callback);
    },
  
    del(db, options, callback) {
      // Implement the 'del' (delete) operation
      db(options.tableName)
        .where(options.conditions)
        .del()
        .asCallback(callback);
    },
  
    raw(db, options, callback) {
      // Implement a 'raw' SQL operation
      db.raw(options.sql)
        .asCallback(callback);
    },
  };
  
  module.exports = dbTable;
  