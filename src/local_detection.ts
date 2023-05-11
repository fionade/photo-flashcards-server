// reading environment variables
require('dotenv').config()
import fs from 'fs'
import path from 'path'
import { PhotoAnalyser } from './PhotoAnalyser'


const photoAnalyser = new PhotoAnalyser()

const remainingFiles = ['00d8d8a2fe276b66.jpg', '0d9c64cee126e67d.jpg', '0d9f7e554735f7b5.jpg', '0d9f4091df442691.jpg', '0d15dce712aa659d.jpg', '0d19c4e59616f85a.jpg', '0d24efe9a8a52483.jpg', '0d27e1f62d1f0c86.jpg', '0d34d5d6354ff5d0.jpg', '0d35a0d95ce8885f.jpg']
remainingFiles.forEach(image => {
    const imageFile = fs.readFileSync(path.join(__dirname, 'static_images', image))

    photoAnalyser.analyseImage(imageFile, 768, 1024, "predefined", false, '')
        .then(result => {
            console.log(`file: ${image}`)
            // console.log(result)
        })
        .catch(error => console.log(error))
})
