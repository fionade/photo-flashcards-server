require('dotenv').config()

import * as mysql from 'mysql2';

class DatabaseHandler {

    private static instance: DatabaseHandler;

    static get Instance() {
        if (this.instance === null || this.instance === undefined) {
            this.instance = new DatabaseHandler();
        }
        return this.instance;
    }

    protected connectionPool: any;
      
    constructor() {
        this.connectionPool = mysql.createPool({
            connectionLimit: 100,
            host: '127.0.0.1',
            user: process.env.db_user,
            password: process.env.db_pw,
            database: 'personal-flashcards',
            multipleStatements: true
        });
    }

    // TODO: promisify
    public getConnection(): any {
        function _query(query: any, params: any, callback: any) {
            DatabaseHandler.Instance.connectionPool.getConnection((err: any, connection: any) => {
                if (err) {
                    if (connection) {
                        connection.release();
                    }
                    callback(err, null);
                    throw err;
                }

                connection.query(query, params, (err: any, rows: any) => {
                    if (connection) {
                        connection.release();
                    }
                    if (!err) {
                        callback(null, rows);
                    } else {
                        callback(err, null);
                    }
                });

                // connection.on('error', (err: any) => {
                //     if (connection) {
                //         connection.release();
                //     }
                //     callback(err, null);
                //     throw err;
                // });
                return;
            });
            return;
        }

        return {
            query: _query
        };
    }

}

export = DatabaseHandler