module.exports = {
    columns: {
        id: { type: 'uuid', notNullable: true, "primary": true },
        "createdDate_tz": {
            "type": "timestamptz",
            "notNullable": true
        },
        "deletedDate_tz": {
            "type": "timestamptz"
        },
        "createdById": {
            "type": "uuid"
        },
        "createdByName": {
            "type": "string"
        }
    },
};