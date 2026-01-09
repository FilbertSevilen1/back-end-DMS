import { db } from '../../config/db.js'
import fs from 'fs'
import { ApiError } from '../../utils/apiError.js'

export const uploadDoc = async (req, res) => {
  const { title, description, documentType } = req.body

  if (!title || !req.file) {
    throw new ApiError(400, 'Title and file required')
  }

  const fileUrl = `/public/documents/${req.file.filename}`

  try {
    await db.query(
      'INSERT INTO documents (title,description,document_type,file_url,created_by) VALUES (?,?,?,?,?)',
      [title, description || null, documentType || null, fileUrl, req.user.id]
    )
    res.sendStatus(201)
  } catch (e) {
    fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw e
  }
}

export const listDocs = async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 10
  const offset = (page - 1) * limit
  const search = req.query.search || ''
  const status = req.query.status

  let where = 'WHERE title LIKE ?'
  const params = [`%${search}%`]

  if (status) {
    where += ' AND status=?'
    params.push(status)
  }

  const [docs] = await db.query(
    `SELECT * FROM documents ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  )

  const [[count]] = await db.query(
    `SELECT COUNT(*) total FROM documents ${where}`,
    params
  )

  res.json({ data: docs, page, limit, total: count.total })
}

export const getDocDetail = async (req, res) => {
  const [[doc]] = await db.query(
    'SELECT * FROM documents WHERE id=?',
    [req.params.id]
  )

  if (!doc) {
    throw new ApiError(404, 'Document not found')
  }

  const [versions] = await db.query(
    'SELECT id,version,file_url,created_at FROM document_versions WHERE document_id=? ORDER BY version DESC',
    [doc.id]
  )

  res.json({ ...doc, versions })
}

export const requestReplace = async (req, res) => {
  const documentId = req.body.document_id

  if (!documentId || !req.file) {
    throw new ApiError(400, 'Document and file required')
  }

  const [[doc]] = await db.query(
    'SELECT * FROM documents WHERE id=?',
    [documentId]
  )

  if (!doc) {
    fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw new ApiError(404, 'Document not found')
  }

  const newFileUrl = `/public/documents/${req.file.filename}`

  if (req.user.role === 'ADMIN') {
    await db.query(
      'INSERT INTO document_versions (document_id,version,file_url,created_by) VALUES (?,?,?,?)',
      [doc.id, doc.version || 1, doc.file_url, req.user.id]
    )

    await db.query(
      'UPDATE documents SET file_url=?, version=version+1 WHERE id=?',
      [newFileUrl, doc.id]
    )

    return res.sendStatus(204)
  }

  if (doc.status !== 'ACTIVE') {
    fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw new ApiError(409, 'Document locked')
  }

  const [[pending]] = await db.query(
    'SELECT id FROM permission_requests WHERE document_id=? AND status="PENDING"',
    [documentId]
  )

  if (pending) {
    fs.unlinkSync(`public/documents/${req.file.filename}`)
    throw new ApiError(409, 'Pending request exists')
  }

  await db.query(
    'INSERT INTO permission_requests (document_id,requested_by,action,new_file_url) VALUES (?,?,?,?)',
    [documentId, req.user.id, 'REPLACE', newFileUrl]
  )

  await db.query(
    'UPDATE documents SET status="PENDING_REPLACE" WHERE id=?',
    [documentId]
  )

  res.sendStatus(201)
}

export const requestDelete = async (req, res) => {
  const documentId = req.body.document_id

  const [[doc]] = await db.query(
    'SELECT * FROM documents WHERE id=?',
    [documentId]
  )

  if (!doc) {
    throw new ApiError(404, 'Document not found')
  }

  if (req.user.role === 'ADMIN') {
    const [versions] = await db.query(
      'SELECT file_url FROM document_versions WHERE document_id=?',
      [doc.id]
    )

    for (const v of versions) {
      fs.unlinkSync(v.file_url.replace('/public', 'public'))
    }

    fs.unlinkSync(doc.file_url.replace('/public', 'public'))

    await db.query('DELETE FROM document_versions WHERE document_id=?', [
      doc.id
    ])

    await db.query('DELETE FROM documents WHERE id=?', [doc.id])

    return res.sendStatus(204)
  }

  if (doc.status !== 'ACTIVE') {
    throw new ApiError(409, 'Document locked')
  }

  const [[pending]] = await db.query(
    'SELECT id FROM permission_requests WHERE document_id=? AND status="PENDING"',
    [documentId]
  )

  if (pending) {
    throw new ApiError(409, 'Pending request exists')
  }

  await db.query(
    'INSERT INTO permission_requests (document_id,requested_by,action) VALUES (?,?,?)',
    [documentId, req.user.id, 'DELETE']
  )

  await db.query(
    'UPDATE documents SET status="PENDING_DELETE" WHERE id=?',
    [documentId]
  )

  res.sendStatus(201)
}
