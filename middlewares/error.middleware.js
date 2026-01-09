export const errorHandler = (err, _, res, __) => {
  res.status(err.status || 500).json({ message: err.message })
}
