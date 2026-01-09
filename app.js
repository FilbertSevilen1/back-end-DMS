import express from 'express'
import dotenv from 'dotenv'
import routes from './routes.js'
import { errorHandler } from './middlewares/error.middleware.js'

dotenv.config()

const app = express()
app.use(express.json())
app.use('/public', express.static('public'))

app.use('/api', routes)
app.use(errorHandler)

export default app
