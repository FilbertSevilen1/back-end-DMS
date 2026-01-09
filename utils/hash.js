import bcrypt from 'bcrypt'

export const hash = (p) => bcrypt.hash(p, 10)
export const compare = (p, h) => bcrypt.compare(p, h)
