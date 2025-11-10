import { Request, Response } from "express";
import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";

interface Book {
  id: string;
  price: number;
  stockQuantity: number;
  genre: { name: string; id: string; createdAt: Date; updatedAt: Date; deletedAt: Date | null } | null;
}
interface OrderItem {
  id: string;
  bookId: string;
  quantity: number;
  orderId: string;
  createdAt: Date;
  updatedAt: Date;
  book: Book;
}
interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  user: { id: string; username: string | null; email: string };
}

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const userId = (req as any).user.userId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid input format" });
    }

    const bookIds = items.map((it: any) => it.book_id);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds }, deletedAt: null },
      include: { genre: true },
    });

    const booksById: Record<string, Book> = {};
    books.forEach((b: Book) => (booksById[b.id] = b));

    for (const item of items) {
      const book = booksById[item.book_id];
      if (!book) {
        return res.status(404).json({ success: false, message: `Book not found: ${item.book_id}` });
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity for book ${item.book_id}` });
      }
      if (book.stockQuantity < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for book ${book.id}` });
      }
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const order = await tx.order.create({ data: { userId } });

      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            bookId: item.book_id,
            quantity: item.quantity,
          },
        });
        await tx.book.update({
          where: { id: item.book_id },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }

      return await tx.order.findUnique({
        where: { id: order.id },
        include: {
          user: true,
          items: { include: { book: { include: { genre: true } } } },
        },
      });
    });

    if (!result) {
      return res.status(500).json({ success: false, message: "Failed to create transaction" });
    }

    const totalQuantity = result.items.reduce((acc: number, it: OrderItem) => acc + it.quantity, 0);
    const totalPrice = result.items.reduce((acc: number, it: OrderItem) => acc + it.quantity * it.book.price, 0);

    return res.status(200).json({
      success: true,
      message: "Transaction created successfully",
      data: {
        transaction_id: result.id,
        total_quantity: totalQuantity,
        total_price: Math.round(totalPrice),
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        user: true,
        items: { include: { book: { include: { genre: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
      success: true,
      message: "Success get all transactions",
      data: orders,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

export const getTransactionDetail = async (req: Request, res: Response) => {
  try {
    const { transaction_id } = req.params;
    const userId = (req as any).user.userId;

    const order = await prisma.order.findUnique({
      where: { id: transaction_id, userId },
      include: {
        user: true,
        items: { include: { book: { include: { genre: true } } } },
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Success get transaction detail",
      data: order,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

export const getTransactionStatistics = async (req: Request, res: Response) => {
  try {
    const totalTransactions = await prisma.order.count();
    const orders: Order[] = await prisma.order.findMany({
      include: {
        user: true,
        items: { include: { book: { include: { genre: true } } } },
      },
    });

    let totalAmount = 0;
    orders.forEach((o: Order) => {
      const subtotal = o.items.reduce(
        (acc: number, item: OrderItem) => acc + item.book.price * item.quantity,
        0
      );
      totalAmount += subtotal;
    });

    const averageAmount = orders.length > 0 ? totalAmount / orders.length : 0;

    const orderItems: OrderItem[] = await prisma.orderItem.findMany({
      include: { book: { include: { genre: true } } },
    });

    const genreCounts: Record<string, number> = {};
    orderItems.forEach((item: OrderItem) => {
      const genreName = item.book.genre?.name || "Unknown";
      genreCounts[genreName] = (genreCounts[genreName] || 0) + item.quantity;
    });

    const genres = Object.entries(genreCounts);
    const sorted = genres.sort((a, b) => b[1] - a[1]);
    const topGenre = sorted[0]?.[0] || null;
    const leastGenre = sorted[sorted.length - 1]?.[0] || null;

    return res.status(200).json({
      success: true,
      message: "Success get transaction statistics",
      data: {
        totalTransactions,
        averageAmount: Math.round(averageAmount),
        topGenre,
        leastGenre,
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};