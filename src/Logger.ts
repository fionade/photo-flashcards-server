import DatabaseHandler from "./model/DatabaseHandler"
import { promisify } from "util"
import { time } from "console"

export class Logger {

    static MAX_CALLS_ALLOWED = 100

    initialiseUser = function(userKey: string, callback: any) {

        // TODO rename column
        const userQuery = 'INSERT INTO `log` (`user_id`, `image_hash`) VALUES (?, ?)'
        const userInserts = [userKey, 'added user']

        const connection = DatabaseHandler.Instance.getConnection()

        connection.query(
            userQuery,
            userInserts,
            (err: any, rows: any) => {
                if (err) {
                    callback(err, null)
                    return
                } else {
                    const typeQuery = 'SELECT COUNT(*) AS `type_count` FROM `log` WHERE `image_hash` = "added user"'
                    connection.query(
                        typeQuery,
                        [],
                        (err2: any, rows2: any) => {
                            if (err2) {
                                callback(err2, null)
                            }
                            else {
                            	// assigning users to conditions
                                // if (Math.random() < 0.8) {
                                    callback(null, {'type' : 'learnersourced'})
                                // }
                                // else {
                                //     callback(null, {'type' : 'personal'})
                                // }
                            }
                        }
                    )
                    return
                }
            })
    }

    checkUserQuota = function(userKey: string, callback: any) {
        // TODO: add WHERE time after yesterday
        let logQuery = 'SELECT COUNT(`timestamp`) AS `log_count` FROM `log` WHERE `user_id` = ? AND `timestamp` >= CURDATE()'
        let logInserts = [userKey]

        DatabaseHandler.Instance.getConnection().query(
            logQuery,
            logInserts,
            (err: any, rows: any) => {
                if (err) {
                    callback(err, null)
                    return
                } else {
                    let remainingCalls = true
                    if (/*rows[0] == 0 ||*/ rows[0].log_count > Logger.MAX_CALLS_ALLOWED) {
                        remainingCalls = false
                    }
                    callback(null, remainingCalls)
                    return
                }
            })

            // returns "COUNT(`timestamp`)": 0
    }

    logRequest = function(userKey: string, action: String, callback: any) { //}, ) {

        let logQuery = 'INSERT INTO `log` (`user_id`, `image_hash`) VALUES (?, ?)'
        let logInserts = [userKey, action]

        DatabaseHandler.Instance.getConnection().query(
            logQuery,
            logInserts,
            (err: any, rows: any) => {
                if (err) {
                    callback(err, null)
                    return
                } else {
                    callback(null, rows[0])
                    return
                }
            })

    }

    logClientAction = function(userKey: string, timestamp: number, type: string, values: string, quizId: number, callback: any) {
        let logQuery = 'INSERT INTO `client_log` (`user_id`, `timestamp`, `type`, `log_values`, `quiz_id`) VALUES (?, ?, ?, ?, ?)'
        let logInserts = [userKey, timestamp, type, values, quizId]

        DatabaseHandler.Instance.getConnection().query(
            logQuery,
            logInserts,
            (err: any, rows: any) => {
                if (err) {
                    callback(err, null)
                    return
                } else {
                    callback(null, rows[0])
                    return
                }
            })
    }

    asyncLogRequest = promisify(this.logRequest)
    asyncCheckUserQuota = promisify(this.checkUserQuota)
    asyncInitialiseUser = promisify(this.initialiseUser)
    asyncLogClientAction = promisify(this.logClientAction)
}