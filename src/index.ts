// reading environment variables
require('dotenv').config()

import express from 'express'
import http from 'http'
import path from 'path'
import fs from 'fs'
import { PhotoAnalyser } from './PhotoAnalyser'
import { Logger } from './Logger'
import DatabaseHandler from "./model/DatabaseHandler"
import { Quiz } from './model/Quiz';
import { PhotoFile } from './model/PhotoFile'

const photoAnalyser = new PhotoAnalyser()
const logger = new Logger()


/***********************************************
 ******** EXPRESS SERVER ***********************
 ***********************************************/

function analyseImage(req: any, res: any) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }
    if (req.body.image) {
        logger.asyncLogRequest(req.body.user_key, `request received: Image dimensions: ${req.body.width}, ${req.body.height}`)

        // convert image from Base64 to Byte array
        const buffer = Buffer.from(req.body.image, 'base64')

        // check if the user has already exceeded the max. number of calls allowed (sanity check)
        logger.asyncCheckUserQuota(req.body.user_key)
        .then(callsRemaining => {
            if (callsRemaining) {
                photoAnalyser.analyseImage(buffer, req.body.width, req.body.height, req.body.user_key.slice(0, 20), req.body.save, req.body.captureTime)
                .then(result => {
                    res.json(result)
                    // log this request, so we can count later
                    logger.asyncLogRequest(req.body.user_key, 'new quiz')
                })
                .catch(e => {
                    console.log(e)
                    res.status(500).send(e)
                })
            }
            else {
                let e = 'exceeded quota'
                console.log(e)
                res.status(403).send(e)
            }
        })
        .catch(e => {
            console.log(e)
            res.status(500).send(e)
        })
        
    }
    else {
        res.json(null)
    }
}

function getPredefinedImage(req: any, res: any) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }
    if (req.body.imagePath) {
        logger.asyncLogRequest(req.body.user_key, `request received: get predefined ${req.body.imagePath}`)
        Quiz.asyncGetPredefinedQuiz(req.body.imagePath)
            .then(result => {
                res.json(result)
            })
            .catch(() => {
                // console.log(e)
                
                // if the predefined image was not found, we run the object detection
                const imagePath = path.join(__dirname, 'user_images', req.body.imagePath)
                const imageFile = fs.readFileSync(imagePath)
                photoAnalyser.analyseImage(imageFile, 4, 3, "predefined", false, '') // TODO image
                    .then((result: any) => {
                        // add the image file to the result
                        result.image = fs.readFileSync(imagePath, {encoding: 'base64'})
                        result.imageName = req.body.imagePath

                        Quiz.asyncReturnQuizIfExists(result.quiz.english)
                            .then((createdQuiz: Quiz) => {
                                createdQuiz.asyncInsertPredefinedQuiz(req.body.imagePath, path.join('user_images', req.body.imagePath))
                            })
                        
                        res.json(result)
                        logger.asyncLogRequest(req.body.user_key, `predefined ${req.body.imagePath}`)
                    })
                    .catch(error => {
                        console.log(error)
                        res.status(500).send(error)
                    })
            })
    }
}

function saveImage(req:any, res: any) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }
    if (req.body.imagePath) {
        const fileName = `${req.body.user_key}_${new Date().toISOString()}.jpg`
        const photoFile = new PhotoFile(fileName, req.body.user_key, req.body.caption)
        photoFile.savePhoto(Buffer.from(req.body.image, 'base64')) // const buffer = Buffer.from(req.body.image, 'base64')
        photoFile.asyncInsertPhoto()
    }
}

async function generateQuizFromCaption(req: any, res: any) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }
    if (req.body.caption) {

        photoAnalyser.translateText(req.body.caption)
        .then(translatedText => {

            const quiz = Quiz.createQuiz(req.body.caption, translatedText)
       
            res.json({'quiz': quiz})
            
            if (req.body.save) {
                const fileName = `${req.body.user_key}_${new Date().toISOString()}.jpg`
                const photoFile = new PhotoFile(fileName, req.body.user_key, req.body.caption)
                photoFile.savePhoto(Buffer.from(req.body.image, 'base64')) // const buffer = Buffer.from(req.body.image, 'base64')
                photoFile.asyncInsertPhoto()
            }

            logger.asyncLogRequest(req.body.user_key, `caption ${req.body.fileName}`)
        })
        .catch(error => {
            console.log(error)
            res.status(500).send(error)
        })
    }
}

function testQuiz(req: any, res: any) {
    res.json({
        "quiz" : {
            "english": "The moustache is under the nose.",
            "german": "Der Schnurrbart ist unter der Nase.",
            "part1": "Der Schnurrbart ist unter",
            "part2": "Geschirr.",
            "solution": "dem",
            "distractor1": "das",
            "distractor2": "die",
            "distractor3": "vom"
        },
        "objects": []
    })
}

function addLog(req: any, res: any) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }

    logger.asyncLogClientAction(req.body.user_key, req.body.timestamp, req.body.type, req.body.values, req.body.quizId)
    .then(_ => {
        res.json({"result": `successfully synchronised log entry ${req.body.id}`})
    })
    .catch(e => {
        console.log(e)
        res.status(500).send(e)
    })
}

function addLogs(req: any, res: any) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }

    let promises: Promise<any>[] = []
    if (req.logs) {
        req.logs.forEach((element: any) => {
            promises.push(logger.asyncLogClientAction(element.user_key, element.timestamp, element.type, element.values, element.quizId))
        });
    }

    Promise.all(promises)
    .then(_ => {
        res.json({"result": 'successfully synchronised log entries'})
    })
    .catch(e => {
        console.log(e)
        res.status(500).send(e)
    })
}

function initialiseUser(req: any, res: any) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }
    else {
        logger.asyncInitialiseUser(req.body.user_key)
        .then(response => {
            res.json(response)
            logger.asyncLogRequest(req.body.user_key, `initialised ${JSON.stringify(response)}`)
        })
        .catch(e => {
            console.log(e)
            res.status(500).send(e)
        })
    }
}

function getToken(req: any, res: any, post: boolean) {
    if (!req.body.user_key) {
        res.status(403).send('Key required for this request')
        return
    }

    let databaseConnection = DatabaseHandler.Instance.getConnection()
    let tokenQuery = ''
    if (post) {
        tokenQuery = 'SELECT `token` FROM `post_tokens` WHERE `user_id` IS NULL LIMIT 1'
    }
    else {
        tokenQuery = 'SELECT `token` FROM `tokens` WHERE `user_id` IS NULL LIMIT 1'
    }
    
    databaseConnection.query(
        tokenQuery,
        [],
        (err: any, rows: any) => {
            if (err) {
                res.status(500).send('Error occurred while retrieving token')
            } 
            else if(rows.length == 0) {
                res.status(500).send('No token found')
            }
            else {
                let updateTokenQuery = post ? 'UPDATE `post_tokens` SET `user_id` = ? WHERE `token` = ?' : 'UPDATE `tokens` SET `user_id` = ? WHERE `token` = ?'
                let updateInserts = [req.body.user_key, rows[0]['token']]
                databaseConnection.query(
                    updateTokenQuery,
                    updateInserts,
                    (err2: any, rows2: any) => {
                        if (err2) {
                            res.status(500).send('Error occurred while retrieving token')
                        }
                        else {
                            res.send({
                                token: rows[0]['token']
                            })
                            logger.asyncLogRequest(req.body.user_key, `token requested ${rows[0]['token']}`)
                        }
                        
                    }
                )
            }
        })
}

async function translateText(req: any, res: any) {
    photoAnalyser.translateText(req.body.text)
        .then(translatedText => {

            res.json({'translation': translatedText})
            
        })
        .catch(error => {
            console.log(error)
            res.status(500).send(error)
        })
}

function getPreToken(req: any, res: any) {
    return getToken(req, res, false)
}

function getPostToken(req: any, res: any) {
    return getToken(req, res, true)
}

const app = express()
const port = process.env.port
app.use(express.json({limit: '5mb'}))

app.use(express.static(path.join(__dirname, 'public')))

app.post('/initialiseUser', initialiseUser)

app.post('/analyseImage', analyseImage)

app.post('/getPredefinedImage', getPredefinedImage)

app.post('/saveImage', saveImage)

app.post('/getQuizFromCaption', generateQuizFromCaption)

app.post('/testQuiz', testQuiz)

app.post('/addLog', addLog)

app.post('/addLogs', addLogs)

app.post('/getToken', getPreToken)

app.post('/getPostToken', getPostToken)

app.post('/translateText', translateText)

app.get('/hello', (req: any, res: any) => {
    res.send('hi')
});

http.createServer(app).listen(port, () => console.log(`Personal flashcard server listening at http://localhost:${port}`))