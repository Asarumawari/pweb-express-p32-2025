import { Router } from 'express'
import libraryController from '../controller/library_controller'
import { authenticateJWT } from '../middlewares/auth'
import multer from 'multer'
import prisma from '../config/prisma'

const upload = multer({ dest: 'uploads/' })
const router = Router()

router.post('/', authenticateJWT, upload.single('cover'), libraryController.addBook)

router.get('/', libraryController.getAllBooks)
router.get('/genre/:genre_id', libraryController.getBooksByGenre)
router.get('/:book_id', libraryController.getBookDetail)
router.patch('/:book_id', authenticateJWT, libraryController.updateBook)
router.delete('/:book_id', authenticateJWT, libraryController.deleteBook)
router.get('/genres', async (req, res) => {
  try {
    const genres = await prisma.genre.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, data: genres })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
})

export default router