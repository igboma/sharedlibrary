module.exports = {
    columns: {
    //   id: { type: 'increments', notNullable: true },
      name: { type: 'string', notNullable: true },
      age: { type: 'integer', defaultTo: 0 },
      size: { type: 'integer', defaultTo: 0 },
      address: { type: 'string', defaultTo: 0 },
    },
  };