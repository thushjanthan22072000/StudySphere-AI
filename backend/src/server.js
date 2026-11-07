
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import filesRouter from './routes/files.js';
import studyRouter from './routes/study.js';

dotenv.config();

const app = express();
app.disable('x-powered-by');

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
]);

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  }
}));

app.use(express.json({ limit: '1mb' }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 100
}));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'studysphere-backend'
  });
});

app.use('/api/files', filesRouter);
app.use('/api/study', studyRouter);

app.use((err, _req, res, _next) => {
  console.error('API error:', err);

  const status = Number.isInteger(err.status) ? err.status : 500;

  res.status(status).json({
    error: err.message || 'Request failed.'
  });
});

const port = Number(process.env.PORT || 5000);

app.listen(port, '0.0.0.0', () => {
  console.log(`StudySphere API listening on port ${port}`);
});
