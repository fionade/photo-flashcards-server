import { Quiz } from './model/Quiz';
import util from 'util';
import { promises as fs } from 'fs'
import path from 'path'
import { PhotoAnalyser, RelativePosition } from './PhotoAnalyser';
import { PhotoFile } from './model/PhotoFile';

// const englishSentence = "The tableware is in front of the Tableware."
// const asyncReturnQuizIfExists = util.promisify(Quiz.returnQuizIfExists)


// async function getResult(englishSentence: string) {
//     return await asyncReturnQuizIfExists(englishSentence)
// }

// getResult(englishSentence).then(result => console.log(result))

// const photoAnalyser = new PhotoAnalyser()
// console.log(photoAnalyser.getSentence("cup", "headphones", RelativePosition.Left, SentenceType.Dative))
// console.log(photoAnalyser.getSentence("cup", "headphones", RelativePosition.Left, SentenceType.Accusative))

// console.log(Quiz.createQuiz(
//     "The tableware is behind the tableware.",
//     "Das Geschirr ist hinter dem Geschirr",
//     RelativePosition.Behind,
//     SentenceType.Dative)
// )
// console.log(Quiz.createQuiz(
//     "I put the tableware behind the tableware.",
//     "Ich lege das Geschirr hinter das Geschirr",
//     RelativePosition.Behind,
//     SentenceType.Accusative)
// )
// console.log(Quiz.createQuiz(
//     "I put the computer to the left of the tableware.",
//     "Ich stelle den Computer links neben das Geschirr",
//     RelativePosition.Left,
//     SentenceType.Accusative)
// )

// console.log(Quiz.createQuiz(
//     "The picture shows a potted plant.",
//     "Das Bild zeigt eine Topfpflanze")
// )

// console.log(Quiz.createQuiz(
//     "The picture shows a hat and a potted plant.",
//     "Das Bild zeigt einen Hut und eine Topfpflanze")
// )

// const photoAnalyser = new PhotoAnalyser()
// console.log(photoAnalyser.getSentenceFromTemplate("computer monitor", "mechanical fan", RelativePosition.Behind))
// console.log(photoAnalyser.getSentenceFromTemplate("tableware", null, null))

console.log(Quiz.createQuiz(
    "What do you see on the picture? I see a shoe.",
    "Was sehen Sie auf dem Bild? Ich sehe einen Schuh.")
)

// fs.readFile(path.join(__dirname, 'static_images', '0d9f4091df442691.jpg'))
// .then(fileContent => {
//     const photoFile = new PhotoFile("blub", "sadfasdf", "sentence")
//     photoFile.savePhoto(fileContent)
//     .then(() => console.log("read and wrote file"))
//     .catch(e => console.log(e))
// })
// .catch(e => console.log(e))