import { Request, Response } from 'express';
import prisma from '../config/prisma';

export const createGenre = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const existing = await prisma.genre.findFirst({ where: { name } });
    if (existing) {
      if (existing.deletedAt) {
        const restored = await prisma.genre.update({
          where: { id: existing.id },
          data: { deletedAt: null },
        });
        return res.status(200).json({ success: true, message: 'Genre restored', data: restored });
      } else {
        return res.status(409).json({ success: false, message: 'Genre name already exists' });
      }
    }

    const genre = await prisma.genre.create({ data: { name } });
    return res.status(201).json({ success: true, message: 'Genre created', data: genre });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export const getAllGenres = async (req: Request, res: Response) => {
  try {
    const genres = await prisma.genre.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    res.json({ success: true, message: 'Genres fetched successfully', data: genres })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getGenreDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const genre = await prisma.genre.findFirst({ where: { id, deletedAt: null } });
    if (!genre) return res.status(404).json({ success: false, message: 'Genre not found' });
    return res.status(200).json({ success: true, message: 'Genre fetched successfully', data: genre });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export const updateGenre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body; // Hapus description
    const genre = await prisma.genre.findFirst({ where: { id, deletedAt: null } });
    if (!genre) return res.status(404).json({ success: false, message: 'Genre not found' });

    if (name && name !== genre.name) {
      const exists = await prisma.genre.findFirst({ where: { name } });
      if (exists && !exists.deletedAt) return res.status(409).json({ success: false, message: 'Genre name already exists' });
    }

    const updated = await prisma.genre.update({
      where: { id },
      data: { name }, 
    });
    return res.status(200).json({ success: true, message: 'Genre updated successfully', data: updated });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export const deleteGenre = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const genre = await prisma.genre.findFirst({ where: { id, deletedAt: null } });
    if (!genre) return res.status(404).json({ success: false, message: 'Genre not found' });

    await prisma.genre.update({ where: { id }, data: { deletedAt: new Date() } });
    return res.status(200).json({ success: true, message: 'Genre deleted successfully' });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
  }
};

export default { createGenre, getAllGenres, getGenreDetail, updateGenre, deleteGenre };
