import { Router } from 'express';
import { createGenre, getAllGenres, getGenreDetail, updateGenre, deleteGenre } from '../controller/genre_controller';
import { authenticateJWT } from '../middlewares/auth';

const router = Router();

router.post('/', authenticateJWT, createGenre);
router.get('/', getAllGenres);
router.get('/:id', getGenreDetail);
router.patch('/:id', authenticateJWT, updateGenre);
router.delete('/:id', authenticateJWT, deleteGenre);

export default router;
