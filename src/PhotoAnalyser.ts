import vision from '@google-cloud/vision'
import types from '@google-cloud/vision'
const {Translate} = require('@google-cloud/translate').v2
import DatabaseHandler from './model/DatabaseHandler'
import { Quiz } from './model/Quiz'
import { PhotoFile } from './model/PhotoFile'

export class PhotoAnalyser {

/***********************************************
 ******** GOOGLE VISION PART *******************
 ***********************************************/
// Creates a Google client for image analysis
    client = new vision.ImageAnnotatorClient()
    translate = new Translate()

    databaseConnection = new DatabaseHandler()

    analyseImage = async function (fileContent: Buffer, width: number, height: number, user: string, save: boolean, captureTime: String) {
        const request = {
            image: {content: fileContent},
            quotaUser: user
        }

        const [result] = await this.client.objectLocalization(request)
        const objects = result.localizedObjectAnnotations
        // objects.forEach((object: any) => {
        //     console.log(`Name: ${object.name}`)
        //     console.log(`Confidence: ${object.score}`)
        //     const vertices = object.boundingPoly.normalizedVertices
        //     vertices.forEach((v: any) => console.log(`x: ${v.x}, y:${v.y}`))
        // })

        // sort by confidence
        const sortedObjects = objects.sort((object1: any, object2: any) => {
            return object1.score - object2.score
        })

        const filteredObjects = this.filterBoundingBoxes(sortedObjects)
        if (filteredObjects.length >= 1) {

            // only set position if we have more than one object
            let sentence = null
            if (filteredObjects.length > 1) {
                let relativePosition = this.getRelativePositions(filteredObjects[0], filteredObjects[1], width, height)
                sentence = this.getSentenceFromTemplate(filteredObjects[0].name.toLowerCase(), filteredObjects[1].name.toLowerCase(), relativePosition)
            }
            else {
                sentence = this.getSentenceFromTemplate(filteredObjects[0].name.toLowerCase())
            }

            // save photo if permission given
            if (save) {
                const fileName = `${user}_${new Date().toISOString()}.jpg`
                const photoFile = new PhotoFile(fileName, user, sentence)
                photoFile.savePhoto(fileContent)
                photoFile.asyncInsertPhoto()
            }
            
            // console.log(`Generated sentence: ${sentence}`)
            
            // get quiz from database if it already exists
            const existingQuiz = await Quiz.asyncReturnQuizIfExists(sentence)
            if (existingQuiz) {
                return {'quiz': existingQuiz, 'objects': filteredObjects}
            }

            // else translate the text and create a new quiz
            const translatedText = await this.translateText(sentence)
            const quiz = Quiz.createQuiz(sentence, translatedText)

            return {'quiz': quiz, 'objects': filteredObjects}
        }

        // the object detection was not successful - let's go for labels instead
        else {
            const labelRequest = {
                image: {content: fileContent},
                quotaUser: user,
                features: [{
                    type: 'LABEL_DETECTION'}
                ]
            }
            const [result] = await this.client.annotateImage(labelRequest)
            const labels = result.labelAnnotations

            if (labels.length > 0) {

                const sortedLabels = labels.sort((label1: any, label2: any) => {
                    return label1.score - label2.score
                })

                const sentence = this.getSentenceFromTemplate(null, null, null, sortedLabels[0].description)

                // save photo if permission given
                if (save) {
                    const fileName = `${user}_${new Date().toISOString()}.jpg`
                    const photoFile = new PhotoFile(fileName, user, sentence)
                    photoFile.savePhoto(fileContent)
                    photoFile.asyncInsertPhoto()
                }

                // get quiz from database if it already exists
                const existingQuiz = await Quiz.asyncReturnQuizIfExists(sentence)
                if (existingQuiz) {
                    return {'quiz': existingQuiz, 'objects': filteredObjects}
                }

                // else translate the text and create a new quiz
                const translatedText = await this.translateText(sentence)
                const quiz = Quiz.createQuiz(sentence, translatedText)
                return {'quiz': quiz, 'objects': filteredObjects}


            }

        }

        return null
    }

    filterBoundingBoxes = function(objects: any) {
        const newObjects : DetectedObject[] = []
        objects.forEach((object: { name: any; score: any; boundingPoly: { normalizedVertices: any } }) => {
            // console.log(`Name: ${object.name}`)
            // console.log(`Confidence: ${object.score}`)
            const vertices = object.boundingPoly.normalizedVertices
            // vertices.forEach((v: { x: any; y: any }) => console.log(`x: ${v.x}, y:${v.y}`))
            if (vertices.length == 4) {
                let boundingBox = new BoundingBox(vertices[0].x, vertices[1].x, vertices[0].y, vertices[2].y)
                let similar = false
                
                newObjects.forEach(o => {
                    // very similar bounding boxes
                    if(Math.abs(o.boundingBox.xMin - vertices[0].x) < 0.1 && Math.abs(o.boundingBox.xMax - vertices[1].x) < 0.1 ||
                        Math.abs(o.boundingBox.yMin - vertices[0].y) < 0.1 && Math.abs(o.boundingBox.yMax - vertices[1].y) < 0.1) {
                        similar = true // performance: break?
                    }
                })
                if (newObjects.length < 2 && !similar) {
                    newObjects.push(new DetectedObject(object.name, object.score, boundingBox))
                }
            }
        })
        return newObjects
    }

    getRelativePositions = function(object1: DetectedObject, object2: DetectedObject, width: number, height: number): RelativePosition {

        // check left - right
        let xDiff1 = object2.boundingBox.xMin - object1.boundingBox.xMax
        let xDiff2 = object1.boundingBox.xMin - object2.boundingBox.xMax

        // is object 1 to the left of object 2?
        let horizontalPosition = xDiff1 >= xDiff2 ? RelativePosition.Left : RelativePosition.Right
        // console.log(`xDiff1: ${xDiff1}, xDiff2: ${xDiff2}`)

        // check above - below
        let yDiff1 = object2.boundingBox.yMax - object1.boundingBox.yMin
        let yDiff2 = object1.boundingBox.yMax - object2.boundingBox.yMin
        // console.log(`yDiff1: ${yDiff1}, yDiff2: ${yDiff2}`)

        // adjust relative scale to aspect ratio of image
        if (width && height) {
            const ratio = width / height
            xDiff1 *= ratio
            xDiff2 *= ratio
        }

        let verticalPosition = yDiff1 >= yDiff2 ? RelativePosition.Behind : RelativePosition.InFront

        if (Math.max(xDiff1, xDiff2) > Math.max(yDiff1, yDiff2)) {
            return horizontalPosition
        }

        return verticalPosition
    }

    getSentenceFromTemplate = function(object1: string, object2: string = null, position: RelativePosition = null, label: string = null) {

        let preposition = ""
        switch(position) {
            case RelativePosition.Behind:
                preposition = "behind"
                break
            case RelativePosition.InFront:
                preposition = "in front of"
                break
            case RelativePosition.Left:
                preposition = "to the left of"
                break
            case RelativePosition.Right:
                preposition = "to the right of"
                break
        }

        let templates = []
        if (object2) {
            if (object1 == object2) {
                templates = [
                    `The picture shows a ${object1} and another ${object2}.`,
                    // `Here you can see several ${object1}s`,
                    `What is ${preposition} the ${object2}? There is another ${object1}.`,
                    `${preposition.charAt(0).toUpperCase() + preposition.slice(1)} the ${object2} you can see another ${object1}.`
                ]
            }
            else {
                templates = [
                    `The picture shows a ${object1} and a ${object2}.`,
                    `Here thou can see a ${object1} and a ${object2}.`,
                    `What is ${preposition} the ${object2}? There is a ${object1}.`,
                    `${preposition.charAt(0).toUpperCase() + preposition.slice(1)} the ${object2} thou can see a ${object1}.`,
                    `The ${object1} is ${preposition} the ${object2}.`
                ]
            }
        }
        else if (object1) {
            templates = [
                `The picture shows a ${object1}.`,
                `What do you see on the picture? I see a ${object1}.`,
                `I think this picture shows a ${object1}.`,
                `Can you see the ${object1} in this picture?`,
                `What a beautiful ${object1}!`,
                `Is there a ${object1} in this scene?`
            ]
        }
        else {
            templates = [
                `The picture shows a ${label}.`,
                `I would describe this picture as a picture of a ${label}.`,
                `A scene with a ${label}.`,
                `Do you like the ${label}?`,
                `Have you ever taken a picture of a ${label}?`
            ]
        }

        return templates[Math.round(Math.random() * (templates.length - 1))]

    }

    translateText = async function(text: string) {
        // Translates the text into the target language. "text" can be a string for
        // translating a single piece of text, or an array of strings for translating
        // multiple texts.
        let [translations] = await this.translate.translate(text, 'de')
        translations = Array.isArray(translations) ? translations : [translations]
        console.log('Translations:')
        translations.forEach((translation: any, i: number) => {
            console.log(`${text[i]} => ('de') ${translation}`)
        })
        if (translations.length > 0) {
            return translations[0]
        }
        return ''
    }

}

class DetectedObject {
    constructor(public name: string, public confidence: number, public boundingBox: BoundingBox) {}
}

class BoundingBox {
    constructor(public xMin: number, public xMax: number, public yMin: number, public yMax: number) {}
}

export enum RelativePosition {
    Behind = 'hinter',
    InFront = 'vor',
    Left = 'links',
    Right = 'rechts'
}