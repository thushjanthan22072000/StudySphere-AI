import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { pool } from '../db/pool.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const allowed = new Set(['.pdf', '.docx', '.pptx', '.txt', '.csv']);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.has(ext)) return cb(new Error('Unsupported file type. Supported: PDF, DOCX, PPTX, TXT, CSV.'));
    cb(null, true);
  }
});

router.post('/', upload.single('file'), async (req, res, next) => {
  let uploadedPath;
  try {
    if (!req.file) return res.status(400).json({ error: 'Please select a file.' });
    uploadedPath = req.file.path;

    const form = new FormData();
    const bytes = fs.readFileSync(uploadedPath);
    form.append('file', new Blob([bytes], { type: req.file.mimetype }), req.file.originalname);

    const processorUrl = process.env.PROCESSOR_URL || 'http://localhost:8000';
    const processorResponse = await fetch(`${processorUrl}/extract`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(120000)
    });
    const extracted = await processorResponse.json().catch(() => ({}));
    if (!processorResponse.ok) {
      return res.status(422).json({ error: extracted.detail || 'Document extraction failed.' });
    }

    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO study_files(id, original_name, mime_type, size_bytes, extracted_text, extraction_report)
       VALUES($1,$2,$3,$4,$5,$6)`,
      [id, req.file.originalname, req.file.mimetype, req.file.size, extracted.text || '', JSON.stringify(extracted.report || {})]
    );

    res.status(201).json({
      id,
      name: req.file.originalname,
      report: extracted.report || {},
      textLength: (extracted.text || '').length
    });
  } catch (error) {
    next(error);
  } finally {
    if (uploadedPath && fs.existsSync(uploadedPath)) fs.unlinkSync(uploadedPath);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, original_name, size_bytes, extraction_status, extraction_report, created_at FROM study_files ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, original_name, extracted_text, extraction_report FROM study_files WHERE id=$1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'File not found.' });
    const file = rows[0];
    res.json({ id: file.id, name: file.original_name, text: file.extracted_text, report: file.extraction_report });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM study_files WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'File not found.' });
    res.json({ message: 'File deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
