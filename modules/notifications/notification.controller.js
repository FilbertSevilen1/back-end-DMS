import { db } from '../../config/db.js'
import { ApiError } from '../../utils/apiError.js'

export const list = async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const offset = (page - 1) * limit

  const [items] = await db.query(
    'SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.id, limit, offset]
  )

  const [[count]] = await db.query(
    'SELECT COUNT(*) total FROM notifications WHERE user_id=?',
    [req.user.id]
  )

  res.json({
    data: items,
    page,
    limit,
    total: count.total
  })
}

export const markRead = async (req, res) => {
  const { id } = req.params

  const [result] = await db.query(
    'UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?',
    [id, req.user.id]
  )

  if (result.affectedRows === 0) {
    throw new ApiError(404, 'Notification not found')
  }

  res.sendStatus(200)
}

export const markAllRead = async (req, res) => {
  await db.query(
    'UPDATE notifications SET is_read=TRUE WHERE user_id=? AND is_read=FALSE',
    [req.user.id]
  )

  res.sendStatus(200)
}
