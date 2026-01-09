import { Router } from 'express'
import { auth } from './middlewares/auth.middleware.js'
import { role } from './middlewares/role.middleware.js'
import { upload } from './middlewares/upload.middleware.js'
import { asyncHandler } from './utils/asyncHandler.js'

import * as Auth from './modules/auth/auth.controller.js'
import * as Doc from './modules/documents/document.controller.js'
import * as Perm from './modules/permissions/permission.controller.js'
import * as Notif from './modules/notifications/notification.controller.js'

const r = Router()

r.post('/auth/register', asyncHandler(Auth.register))
r.post('/auth/login', asyncHandler(Auth.login))

r.post(
  '/documents',
  auth,
  upload.single('file'),
  asyncHandler(Doc.uploadDoc)
)
r.get('/documents', auth, asyncHandler(Doc.listDocs))
r.get('/documents/:id', auth, asyncHandler(Doc.getDocDetail))

r.post(
  '/documents/request-replace',
  auth,
  upload.single('file'),
  asyncHandler(Doc.requestReplace)
)
r.post(
  '/documents/request-delete',
  auth,
  asyncHandler(Doc.requestDelete)
)

r.post(
  '/permissions',
  auth,
  upload.single('file'),
  asyncHandler(Perm.requestAction)
)
r.get(
  '/permissions/pending',
  auth,
  role('ADMIN'),
  asyncHandler(Perm.listPending)
)
r.post(
  '/permissions/:id/approve',
  auth,
  role('ADMIN'),
  asyncHandler(Perm.approve)
)
r.post(
  '/permissions/:id/reject',
  auth,
  role('ADMIN'),
  asyncHandler(Perm.reject)
)

r.get('/notifications', auth, asyncHandler(Notif.list))
r.patch(
  '/notifications/:id/read',
  auth,
  asyncHandler(Notif.markRead)
)
r.patch(
  '/notifications/read-all',
  auth,
  asyncHandler(Notif.markAllRead)
)

export default r
