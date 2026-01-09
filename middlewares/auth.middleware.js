import jwt from 'jsonwebtoken'

export const auth = (req, _, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) throw new Error('Unauthorized')
  req.user = jwt.verify(token, process.env.JWT_SECRET)
  next()
}
