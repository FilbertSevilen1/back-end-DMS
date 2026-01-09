import multer from 'multer'
import path from 'path'

const storage = multer.diskStorage({
  destination: 'public/documents',
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

export const upload = multer({ storage })
