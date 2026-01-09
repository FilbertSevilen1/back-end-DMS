export const role = (r) => (req, _, next) => {
  if (req.user.role !== r) throw new Error('Forbidden')
  next()
}
