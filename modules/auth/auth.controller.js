import jwt from 'jsonwebtoken'
import { db } from '../../config/db.js'
import { hash, compare } from '../../utils/hash.js'
import { ApiError } from '../../utils/apiError.js'

export const register = async (req, res) => {
  const { email, password, role } = req.body

  if (!email || !password) {
    throw new ApiError(400, 'Email and password required')
  }

  const [[exists]] = await db.query(
    'SELECT id FROM users WHERE email=?',
    [email]
  )

  if (exists) {
    throw new ApiError(409, 'Email already registered')
  }

  const passwordHash = await hash(password)

  await db.query(
    'INSERT INTO users (email,password_hash,role) VALUES (?,?,?)',
    [email, passwordHash, role === 'ADMIN' ? 'ADMIN' : 'USER']
  )

  res.status(201).json({ message: 'User registered' })
}

export const login = async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    throw new ApiError(400, 'Email and password required')
  }

  const [[user]] = await db.query(
    'SELECT id,password_hash,role FROM users WHERE email=?',
    [email]
  )

  if (!user) {
    throw new ApiError(401, 'Invalid credentials')
  }

  const valid = await compare(password, user.password_hash)

  if (!valid) {
    throw new ApiError(401, 'Invalid credentials')
  }
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )

  res.json({
    token,
    user: {
      id: user.id,
      role: user.role
    }
  })
}
