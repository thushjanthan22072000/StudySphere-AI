import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  UploadCloud,
  FileText,
  Trash2,
  Sparkles,
  Languages,
  GraduationCap
} from 'lucide-react';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function App() {
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState('');
  const [task, setTask] = useState('Explain this file in detail');
  const [language, setLanguage] = useState('Simple English');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  async function loadFiles() {
    try {
      const response = await fetch(`${API}/files`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Cannot load files. Is the backend running?');
      }

      setFiles(Array.isArray(data) ? data : []);

      if (selected && !data.some((file) => file.id === selected)) {
        setSelected('');
      }
    } catch (error) {
      setMessage(error.message || 'Unable to load uploaded files.');
    }
  }

  useEffect(() => {
    loadFiles();
    // Load the library once when the application opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage('Uploading and extracting document...');

    const body = new FormData();
    body.append('file', file);

    try {
      const response = await fetch(`${API}/files`, {
        method: 'POST',
        body
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Upload failed.');
      }

      setMessage(
        `Uploaded ${data.name}. Extracted ${data.textLength} characters.`
      );

      await loadFiles();
      setSelected(data.id);
      setOutput('');
    } catch (error) {
      setMessage(error.message || 'Document upload failed.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  }

  async function removeFile(id) {
    if (!window.confirm('Delete this file and its generated study outputs?')) {
      return;
    }

    try {
      const response = await fetch(`${API}/files/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Delete failed.');
      }

      if (selected === id) {
        setSelected('');
        setOutput('');
      }

      setMessage('File deleted.');
      await loadFiles();
    } catch (error) {
      setMessage(error.message || 'Unable to delete this file.');
    }
  }

  async function generate() {
    if (!selected) {
      setMessage('Please select a source file first.');
      return;
    }

    setBusy(true);
    setOutput('');
    setMessage('Generating from the selected file only...');

    try {
      const response = await fetch(`${API}/study/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fileIds: [selected],
          task,
          language
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Study material generation failed.');
      }

      setOutput(data.content || '');
      setMessage(`Completed using selected source: ${data.source || selectedFile?.original_name || 'Selected document'}`);
    } catch (error) {
      setMessage(error.message || 'Unable to generate study material.');
    } finally {
      setBusy(false);
    }
  }

  const selectedFile = files.find((file) => file.id === selected);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brandIcon">
            <GraduationCap size={23} />
          </div>
          <div>
            <b>StudySphere AI</b>
            <small>YOUR PERSONAL ACADEMIC WORKSPACE</small>
          </div>
        </div>
        <span className="status">
          <i /> Document-grounded study
        </span>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow">
            <Sparkles size={15} /> AI-POWERED LEARNING WORKSPACE
          </div>
          <h1>
            Understand more.
            <br />
            <em>Study smarter.</em>
          </h1>
          <p>
            Upload your academic materials and turn them into clear
            explanations, structured notes and exam questions.
          </p>
        </section>

        <div className="workspace">
          <aside className="panel sources">
            <div className="panelHead">
              <div>
                <span className="eyebrow">YOUR LIBRARY</span>
                <h2>Source files</h2>
              </div>
              <BookOpen size={20} />
            </div>

            <label className={`upload ${uploading ? 'disabled' : ''}`}>
              <UploadCloud size={25} />
              <b>{uploading ? 'Processing...' : 'Upload a document'}</b>
              <span>PDF, DOCX, PPTX, TXT or CSV · Max 25 MB</span>
              <input
                type="file"
                accept=".pdf,.docx,.pptx,.txt,.csv"
                onChange={upload}
                disabled={uploading}
              />
            </label>

            <div className="fileList">
              {files.length === 0 ? (
                <div className="empty">
                  Your uploaded documents will appear here.
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className={`fileItem ${selected === file.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelected(file.id);
                      setOutput('');
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelected(file.id);
                        setOutput('');
                      }
                    }}
                  >
                    <FileText size={19} />
                    <div className="fileName">
                      <b>{file.original_name}</b>
                      <small>
                        {(Number(file.size_bytes) / 1024).toFixed(0)} KB
                      </small>
                    </div>
                    <button
                      type="button"
                      className="iconBtn"
                      title="Delete file"
                      aria-label={`Delete ${file.original_name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeFile(file.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <p className="privacyNote">
              Only the file you select is used for each study task. Other
              uploaded files are not automatically included.
            </p>
          </aside>

          <section className="panel study">
            <div className="panelHead">
              <div>
                <span className="eyebrow">LEARNING STUDIO</span>
                <h2>Create study material</h2>
              </div>
              <Sparkles size={20} />
            </div>

            <div className="selectedSource">
              <span>SELECTED SOURCE</span>
              <b>{selectedFile?.original_name || 'No source selected'}</b>
            </div>

            <label className="fieldLabel">What would you like to do?</label>
            <div className="taskGrid">
              {[
                ['Explain this file in detail', 'Explanation'],
                ['Create structured study notes', 'Study notes'],
                ['Generate exam questions with answers', 'Exam questions']
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={`task ${task === value ? 'chosen' : ''}`}
                  onClick={() => setTask(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="fieldLabel" htmlFor="output-language">
              Output language
            </label>
            <div className="language">
              <Languages size={18} />
              <select
                id="output-language"
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
              >
                <option>Simple English</option>
                <option>Academic English</option>
                <option>Tamil</option>
                <option>English and Tamil</option>
              </select>
            </div>

            <button
              type="button"
              className="generate"
              disabled={busy || !selected}
              onClick={generate}
            >
              <Sparkles size={18} />
              {busy ? 'Generating...' : 'Generate study material'}
            </button>

            {message && (
              <div className="message" role="status">
                {message}
              </div>
            )}

            <div className="output">
              <div className="outputHead">
                <b>Generated material</b>
                <span>{output ? 'RESULT' : 'READY WHEN YOU ARE'}</span>
              </div>

              {output ? (
                <article className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      table: ({ children }) => (
                        <div className="table-wrapper">
                          <table>{children}</table>
                        </div>
                      )
                    }}
                  >
                    {output
  .replace(/\\n/g, '\n')
  .replace(/<br\s*\/?>/gi, '\n')}
                  </ReactMarkdown>
                </article>
              ) : (
                <div className="outputEmpty">
                  <Sparkles size={28} />
                  <b>Your learning material will appear here</b>
                  <span>
                    Select a source file, choose a task and generate.
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer>
          StudySphere AI · Starter MVP · Always check generated answers
          against your original study materials.
        </footer>
      </main>
    </div>
  );
}
