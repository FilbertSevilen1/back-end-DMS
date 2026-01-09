import { db } from '../../config/db.js'
import fs from 'fs'
import { ApiError } from '../../utils/apiError.js'

export const requestAction = async (req, res) => {
  const { documentId, action } = req.body

  if (!documentId || !['DELETE','REPLACE'].includes(action)) {
    throw new ApiError(400, 'Invalid request')
  }

  if (action === 'REPLACE' && !req.file) {
    throw new ApiError(400, 'File required for replace')
  }

  const [[doc]] = await db.query(
    'SELECT status FROM documents WHERE id=?',
    [documentId]
  )

  if (!doc) {
    if (req.file) fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw new ApiError(404, 'Document not found')
  }

  if (doc.status !== 'ACTIVE') {
    if (req.file) fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw new ApiError(409, 'Document locked')
  }

  const [[pending]] = await db.query(
    'SELECT id FROM permission_requests WHERE document_id=? AND status="PENDING"',
    [documentId]
  )

  if (pending) {
    if (req.file) fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw new ApiError(409, 'Pending request exists')
  }

  const newFileUrl = req.file
    ? `/public/documents/${req.file.filename}`
    : null

  try {
    await db.query(
      'INSERT INTO permission_requests (document_id,requested_by,action,new_file_url) VALUES (?,?,?,?)',
      [documentId, req.user.id, action, newFileUrl]
    )

    await db.query(
      'UPDATE documents SET status=? WHERE id=?',
      [action === 'DELETE' ? 'PENDING_DELETE' : 'PENDING_REPLACE', documentId]
    )

    res.sendStatus(201)
  } catch (e) {
    if (req.file) fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw e
  }
}

export const listPending = async (_, res) => {
  const [rows] = await db.query(`
    SELECT pr.id, pr.action, pr.created_at,
           d.id document_id, d.title,
           u.email requested_by
    FROM permission_requests pr
    JOIN documents d ON d.id = pr.document_id
    JOIN users u ON u.id = pr.requested_by
    WHERE pr.status='PENDING'
    ORDER BY pr.created_at ASC
  `)

  res.json(rows)
}

export const approve = async (req, res) => {
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [[pr]] = await conn.query(
      'SELECT * FROM permission_requests WHERE id=? AND status="PENDING"',
      [req.params.id]
    )

    if (!pr) throw new ApiError(404, 'Request not found')

    const [[doc]] = await conn.query(
      'SELECT * FROM documents WHERE id=?',
      [pr.document_id]
    )

    if (pr.action === 'DELETE') {
      fs.unlinkSync(doc.file_url.replace('/public', 'public'))
      await conn.query('DELETE FROM permission_requests WHERE document_id=?', [doc.id])
      await conn.query('DELETE FROM document_versions WHERE document_id=?', [doc.id])
      await conn.query('DELETE FROM documents WHERE id=?', [doc.id])
    }

    if (pr.action === 'REPLACE') {
      const newVersion = doc.version + 1

      await conn.query(
        'INSERT INTO document_versions (document_id,file_url,version,created_by) VALUES (?,?,?,?)',
        [doc.id, doc.file_url, doc.version, pr.requested_by]
      )

      await conn.query(
        'UPDATE documents SET file_url=?, version=?, status="ACTIVE" WHERE id=?',
        [pr.new_file_url, newVersion, doc.id]
      )
    }

    await conn.query(
      'UPDATE permission_requests SET status="APPROVED", resolved_by=?, resolved_at=NOW() WHERE id=?',
      [req.user.id, pr.id]
    )

    await conn.query(
      'INSERT INTO notifications (user_id,message) VALUES (?,?)',
      [pr.requested_by, `Your ${pr.action} request was approved`]
    )

    await conn.commit()
    res.sendStatus(200)

  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

export const reject = async (req, res) => {
  const conn = await db.getConnection()

  try {
    await conn.beginTransaction()

    const [[pr]] = await conn.query(
      'SELECT * FROM permission_requests WHERE id=? AND status="PENDING"',
      [req.params.id]
    )

    if (!pr) throw new ApiError(404, 'Request not found')

    if (pr.action === 'REPLACE' && pr.new_file_url) {
      fs.unlinkSync(pr.new_file_url.replace('/public', 'public'))
    }

    await conn.query(
      'UPDATE permission_requests SET status="REJECTED", resolved_by=?, resolved_at=NOW() WHERE id=?',
      [req.user.id, pr.id]
    )

    await conn.query(
      'UPDATE documents SET status="ACTIVE" WHERE id=?',
      [pr.document_id]
    )

    await conn.query(
      'INSERT INTO notifications (user_id,message) VALUES (?,?)',
      [pr.requested_by, `Your ${pr.action} request was rejected`]
    )

    await conn.commit()
    res.sendStatus(200)

  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}
