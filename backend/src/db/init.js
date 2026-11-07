import { pool } from './pool.js';

const sql = `
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS study_files (
  id UUID PRIMARY KEY,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  extracted_text TEXT NOT NULL DEFAULT '',
  extraction_status TEXT NOT NULL DEFAULT 'processed',
  extraction_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS study_outputs (
  id UUID PRIMARY KEY,
  file_id UUID NOT NULL REFERENCES study_files(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  content TEXT NOT NULL,
  model_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

try {
  await pool.query(sql);
  console.log('Database initialized.');
} catch (error) {
  console.error('Database initialization failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
