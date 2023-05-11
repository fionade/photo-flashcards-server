import { promises as fspromises } from 'fs'
import fs from 'fs'
import util from 'util'
import path from 'path'
import DatabaseHandler from "./DatabaseHandler"
import { Logger } from '../Logger'

const logger = new Logger()
const directory = path.join(__dirname, '..', '..', 'user_images')

export class PhotoFile {

    private directory: String

    constructor(public filename: String, public userID: String, public english: String) {}

    insertPhoto = function(callback: any) {

        let insertQuery = 'INSERT IGNORE INTO `photo_files` (`filename`, `user_id`, `english_sentence`) VALUES (?, ?, ?)'
        let inserts = [this.filename, this.userId, this.english]

        DatabaseHandler.Instance.getConnection().query(
            insertQuery,
            inserts,
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

    savePhoto = async function(fileContent: Buffer) {
        console.log("save file " + path.join(directory, this.filename))

        if (!fs.existsSync(directory)){
            fs.mkdirSync(directory)
        }

        fspromises.writeFile(path.join(directory, this.filename), fileContent)
        .then(/*() => /*logger.asyncLogRequest(this.userID, `saved file ${this.filename}`)*/)
        .catch(e => console.log(e))
    }

    asyncInsertPhoto = util.promisify(this.insertPhoto)
}