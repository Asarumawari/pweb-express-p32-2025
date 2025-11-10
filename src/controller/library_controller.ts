import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client'; 

const prisma = new PrismaClient()

interface Book {
  id: string;
  title: string;
  writer: string;
  publisher: string;
  description: string | null;
  genre: { name: string } | null;
  publicationYear: number;
  price: number;
  stockQuantity: number;
}

export const addBook = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const title = body.title ?? body.title;
    const writer = body.writer ?? body.writer;
    const publisher = body.publisher ?? body.publisher;
    const publicationYear = body.publicationYear ?? body.publication_year;
    const description = body.description ?? body.description;
    const price = body.price ?? body.price;
    const stockQuantity = body.stockQuantity ?? body.stock_quantity;
    const genreId = body.genreId ?? body.genre_id;

    const missing: string[] = [];
    if (!title) missing.push('title');
    if (!writer) missing.push('writer');
    if (!publisher) missing.push('publisher');
    if (publicationYear === undefined || publicationYear === null) missing.push('publicationYear');
    if (price === undefined || price === null) missing.push('price');
    if (stockQuantity === undefined || stockQuantity === null) missing.push('stockQuantity');
    if (!genreId) missing.push('genreId');

    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: `Missing required fields: ${missing.join(', ')}` });
    }

    const genre = await prisma.genre.findUnique({ where: { id: genreId } });
    if (!genre) {
      return res.status(404).json({ success: false, message: 'Genre not found' });
    }

    const book = await prisma.book.create({
      data: {
        title,
        writer,
        publisher,
        publicationYear: Number(publicationYear),
        description: description || null,
        price: Number(price),
        stockQuantity: Number(stockQuantity),
        genreId,
      },
      select: { id: true, title: true, createdAt: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Book added successfully',
      data: { id: book.id, title: book.title, created_at: book.createdAt },
    });
  } catch (error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Buku ini sudah ditambahkan' });
    }
    return res.status(500).json({ success: false, message: error?.meta?.cause || error?.message || 'Internal Server Error' });
  }
};

export const getAllBooks = async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      genre_id, 
      sort = 'title', 
      order = 'asc', 
      page = '1', 
      limit = '12' 
    } = req.query

    const validSorts = ['title', 'createdAt'] as const
    const validOrders = ['asc', 'desc'] as const
    const sortBy = validSorts.includes(sort as any) ? sort as 'title' | 'createdAt' : 'title'
    const sortOrder = validOrders.includes(order as any) ? order as 'asc' | 'desc' : 'asc'

    const where: any = {}
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { writer: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    if (genre_id) where.genreId = genre_id

    const orderBy = sortBy === 'createdAt' 
      ? { createdAt: sortOrder } 
      : { title: sortOrder }

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.max(1, Number(limit) || 12)
    const skip = (pageNum - 1) * limitNum

    const [books, total] = await Promise.all([
      prisma.book.findMany({
        where,
        orderBy,
        include: { genre: { select: { name: true } } },
        skip,
        take: limitNum,
      }),
      prisma.book.count({ where })
    ])

    res.json({
      success: true,
      data: books,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message })
  }
}

export const getBookDetail = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const book = await prisma.book.findFirst({
      where: { id: book_id, deletedAt: null },
      include: { genre: true },
    });

    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    const data = {
      id: book.id,
      title: book.title,
      writer: book.writer,
      publisher: book.publisher,
      description: book.description,
      publicationYear: book.publicationYear,
      price: book.price,
      stockQuantity: book.stockQuantity,
      genre: book.genre?.name ?? null,
    };

    return res.status(200).json({ success: true, message: 'Get book detail successfully', data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Internal Server Error' });
  }
};

export const getBooksByGenre = async (req: Request, res: Response) => {
  try {
    const { genre_id } = req.body;
    const { title, writer, publisher, page = '1', limit = '5' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 5);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { deletedAt: null, genreId: genre_id };
    if (title) where.title = { contains: title, mode: 'insensitive' };
    if (writer) where.writer = { contains: writer, mode: 'insensitive' };
    if (publisher) where.publisher = { contains: publisher, mode: 'insensitive' };

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({ where, include: { genre: true }, skip, take: limitNum, orderBy: { createdAt: 'desc' } }),
    ]);

    const data = books.map((b: Book) => ({
      id: b.id,
      title: b.title,
      writer: b.writer,
      publisher: b.publisher,
      description: b.description,
      genre: b.genre?.name ?? null,
      publicationYear: b.publicationYear,
      price: b.price,
      stockQuantity: b.stockQuantity,
    }));

    const totalPages = Math.ceil(total / limitNum) || 1;
    const nextPage = pageNum < totalPages ? pageNum + 1 : null;
    const prevPage = pageNum > 1 ? pageNum - 1 : null;

    return res.status(200).json({
      success: true,
      message: 'Get all book by genre successfully',
      data,
      meta: { page: pageNum, limit: limitNum, prev_page: prevPage, next_page: nextPage },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Internal Server Error' });
  }
};

export const updateBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;
    const body = req.body || {};

    const title = body.title ?? body.title;
    const writer = body.writer ?? body.writer;
    const publisher = body.publisher ?? body.publisher;
    const description = body.description ?? body.description;
    const publicationYear = body.publicationYear ?? body.publication_year;
    const price = body.price ?? body.price;
    const stockQuantity = body.stockQuantity ?? body.stock_quantity;
    const genreId = body.genreId ?? body.genre_id;

    const existing = await prisma.book.findFirst({ where: { id: book_id, deletedAt: null } });
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found' });

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (writer !== undefined) data.writer = writer;
    if (publisher !== undefined) data.publisher = publisher;
    if (description !== undefined) data.description = description;
    if (publicationYear !== undefined) data.publicationYear = Number(publicationYear);
    if (price !== undefined) data.price = Number(price);
    if (stockQuantity !== undefined) data.stockQuantity = Number(stockQuantity);
    if (genreId !== undefined) data.genreId = genreId;

    const updated = await prisma.book.update({ where: { id: book_id }, data, select: { id: true, title: true, updatedAt: true } });

    const responseData = {
      id: updated.id,
      title: updated.title,
      updated_at: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt,
    };

    return res.status(200).json({ success: true, message: 'Book updated successfully', data: responseData });
  } catch (error: any) {
    const message = error?.meta?.cause || error?.message || 'Internal Server Error';
    return res.status(500).json({ success: false, message });
  }
};

export const deleteBook = async (req: Request, res: Response) => {
  try {
    const { book_id } = req.params;

    const book = await prisma.book.findFirst({ where: { id: book_id, deletedAt: null } });
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });

    await prisma.book.update({ where: { id: book_id }, data: { deletedAt: new Date() } });

    return res.status(200).json({ success: false, message: 'Book removed successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error?.message || 'Internal Server Error' });
  }
};

export default { addBook, getAllBooks, getBookDetail, getBooksByGenre, updateBook, deleteBook };
