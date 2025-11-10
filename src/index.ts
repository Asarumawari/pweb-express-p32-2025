import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors'
import authRouter from './router/auth_router'; 
import libraryRouter from './router/library_router';
import genreRouter from './router/genre_router';
import transactionRouter from './router/transaction_router';

dotenv.config();
const app = express();

app.use(express.json());
app.use('/uploads', express.static('uploads'))

app.get('/', (_: Request, response: Response) => {
  response.status(200).send('Server is up and running 💫');
});

app.use(cors({
  origin: 'http://localhost:5173'
}))

app.use('/auth', authRouter);
app.use('/books', libraryRouter);
app.use('/genres', genreRouter);
app.use('/transactions', transactionRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Express is running on Port ${PORT}`);
});

export default app;
