import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool.js';
import { generateStudyContent } from '../services/aiService.js';

const router = Router();
router.post('/generate', async (req, res, next) => {
  try {
    const { fileIds, task, language = 'Simple English' } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length !== 1) {
      return res.status(400).json({ error: 'Select exactly one source file in this MVP. Multi-file selection will be enabled in the next iteration.' });
    }
    const allowedTasks = ['Explain this file in detail', 'Create structured study notes', 'Generate exam questions with answers'];
    if (!allowedTasks.includes(task)) return res.status(400).json({ error: 'Invalid task.' });
    const { rows } = await pool.query('SELECT id, original_name, extracted_text FROM study_files WHERE id=$1', [fileIds[0]]);
    if (!rows.length) return res.status(404).json({ error: 'Selected source file was not found.' });
    const output = await generateStudyContent({ text: rows[0].extracted_text, task, language });
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO study_outputs(id,file_id,task_type,language,content,model_name) VALUES($1,$2,$3,$4,$5,$6)',
      [id, rows[0].id, task, language, output, process.env.OPENAI_MODEL || 'extract-preview']
    );
    res.json({ id, source: rows[0].original_name, task, language, content: output });
  } catch (e) { next(e); }
});

router.get('/history/:fileId', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, task_type, language, created_at FROM study_outputs WHERE file_id=$1 ORDER BY created_at DESC', [req.params.fileId]);
    res.json(rows);
  } catch (e) { next(e); }
});
export default router;
