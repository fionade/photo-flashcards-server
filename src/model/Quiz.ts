import DatabaseHandler from "./DatabaseHandler"
import util from 'util'
import fs from 'fs'
import path from 'path'

// defining model
export class Quiz {
    
    static options: string[] = ['der', 'dem', 'die', 'den', 'das', 'vom', 'im']
    static singleOptions: string[] = ['eine', 'einen', 'einer', 'einem', 'eines', 'ein']
    static optionsCap: string[] = ['Der', 'Dem', 'Die', 'Den', 'Das', 'Vom', 'Im']
    static singleOptionsCap: string[] = ['Eine', 'Einen', 'Einer', 'Einem', 'Eines', 'Ein']

    constructor(public english: string, public german: string,
        public part1: string, public part2: string, public solution: string, public distractor1: string,
        public distractor2: string, public distractor3: string, public id = -1) {}

    static returnQuizIfExists = function(english_sentence: string, callback: any) {

        let checkQuizQuery = 'SELECT `english_sentence`, `german_sentence`, `part1`, `part2`, `solution`,' +
            '`distractor1`, `distractor2`, `distractor3`, `id` FROM `quiz` WHERE `english_sentence` = ?'

        DatabaseHandler.Instance.getConnection().query(
            checkQuizQuery,
            english_sentence,
            (err: any, rows: any) => {
                if (err) {
                    callback(err, null)
                    return
                } else {
                    let quiz = null
                    if (rows.length > 0) {
                        quiz = new Quiz(
                            rows[0]['english_sentence'],
                            rows[0]['german_sentence'],
                            rows[0]['part1'],
                            rows[0]['part2'],
                            rows[0]['solution'],
                            rows[0]['distractor1'],
                            rows[0]['distractor2'],
                            rows[0]['distractor3'],
                            rows[0]['id'])
                    }
                    callback(null, quiz)
                    return
                }
            })
    }

    static createQuiz = function(text: string, translation: string) {

        // improve some common translation results
        translation = translation.replace('Es gibt einen', 'Dort ist ein').replace('Es gibt einen', 'Dort ist ein')
        translation = translation.replace('ehen Sie', 'iehst du').replace('önnen Sie', 'annst du').replace('Es gibt', 'Dort ist')
        translation = translation.replace('eine verpackte Ware', 'einen Gegenstand').replace('einer verpackten Ware', 'einem Gegenstand')

        const wordList = translation.split(' ')
        const indices: number[] = []

        const extendedOptions = Quiz.singleOptions.concat(Quiz.options)
        wordList.forEach((word, index) => {
            // We use "Bild" in the template sentences; exclude this to only use detected objects
            if (extendedOptions.includes(word.toLowerCase()) && index < wordList.length - 1 && wordList[index + 1] != 'Bild' && wordList[index + 1] != 'Bild?') {
                indices.push(index)
            }
        })

        if(indices.length > 0) {
            const chosenIndex = indices[Math.round(Math.random() * (indices.length - 1))]
            const solution = wordList[chosenIndex]

            // definite or indefinite article? Lower case or upper case?
            let options: string[] = []
            if (Quiz.singleOptions.includes(solution)) {
                options = Quiz.singleOptions
            }
            else if (Quiz.singleOptionsCap.includes(solution)) {
                options = Quiz.singleOptionsCap
            }
            else if (Quiz.optionsCap.includes(solution)) {
                options = Quiz.optionsCap
            }
            else {
                options = Quiz.options
            }

            let distractors: string[] = []
            while(distractors.length < 4) {
                let distractorIndex = Math.round(Math.random() * (options.length - 1))
                let nextWord = options[distractorIndex]
                // only add the new word if it's not already in the list
                // possible alternative: set
                if (!distractors.includes(nextWord) && solution != nextWord) {
                    distractors.push(nextWord);
                }
            }

            const quiz = new Quiz(
                text,
                translation,
                wordList.slice(0, chosenIndex).join(' '),
                wordList.slice(chosenIndex + 1).join(' '),
                solution,
                distractors[0],
                distractors[1],
                distractors[2]
            )

            quiz.insertQuiz((result: any) => console.log(result), (error: any) => console.log(error.message))

            return quiz

        }
        else {
            // couldn't find a word to replace
            return null

        }

    }

    static getPredefinedQuiz = function(name: String, callback: any) {
        let databaseConnection = DatabaseHandler.Instance.getConnection()
        const quizQuery = 'SELECT `file`, `image_code`, `english_sentence`, `german_sentence`, `part1`, `part2`, `solution`,' +
        '`distractor1`, `distractor2`, `distractor3` FROM `predefined` p INNER JOIN `quiz` q ON q.`id` = p.`quiz_id` WHERE `image_code` = ?'
        const quizInserts = [name]

        databaseConnection.query(
            quizQuery,
            quizInserts,
            (err: any, rows: any) => {
                if (err) {
                    callback('Error occurred while retrieving quiz', null)
                } 
                else if(rows.length == 0) {
                    callback(`No quiz found with name ${name}`, null)
                }
                else {
                    const quiz = new Quiz(
                        rows[0]['english_sentence'],
                        rows[0]['german_sentence'],
                        rows[0]['part1'],
                        rows[0]['part2'],
                        rows[0]['solution'],
                        rows[0]['distractor1'],
                        rows[0]['distractor2'],
                        rows[0]['distractor3'])

                    callback(null, {
                        "quiz": quiz,
                        "image": fs.readFileSync(path.join(__dirname, '..', rows[0]['file']), {encoding: 'base64'}),
                        "imageName": rows[0]['image_code']
                    })
                    
                }
            })
    }

    static asyncReturnQuizIfExists = util.promisify(Quiz.returnQuizIfExists)
    static asyncGetPredefinedQuiz = util.promisify(Quiz.getPredefinedQuiz)

    insertQuiz = function(callback: any, error: any) {

        // TODO duplicate update?
        let insertQuizQuery = 'INSERT IGNORE INTO `quiz` (`english_sentence`, `german_sentence`, `part1`, `part2`, `solution`, `distractor1`, `distractor2`, `distractor3`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'

        let quizInserts = [this.english, this.german, this.part1, this.part2, this.solution, this.distractor1, this.distractor2, this.distractor3]

        DatabaseHandler.Instance.getConnection().query(
            insertQuizQuery,
            quizInserts,
            (err: any, rows: any) => {
                if (err) {
                    error(err)
                    return
                } else {
                    callback(rows[0])
                    return
                }
            })
    }

    insertPredefinedQuiz = function(imageCode: string, imageFile: string, callback: any) {

        let insertQuery = 'INSERT IGNORE INTO `predefined` (`image_code`, `file`, `quiz_id`) VALUES (?, ?, ?)'
        let inserts = [imageCode, imageFile, this.id]

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

    asyncInsertPredefinedQuiz = util.promisify(this.insertPredefinedQuiz)

}