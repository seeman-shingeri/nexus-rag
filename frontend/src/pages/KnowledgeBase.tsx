import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Upload, 
  Trash2, 
  FileText, 
  Search, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Layers,
  X
} from 'lucide-react';
import { DocumentItem, DocumentDetail } from '../types';
import { api } from '../services/api';

export const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Safety Manual');

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (titleInput.trim()) {
      formData.append('title', titleInput.trim());
    }
    formData.append('category', categoryInput);

    try {
      await api.uploadDocument(formData);
      setTitleInput('');
      await fetchDocuments();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload and index document.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleViewChunks = async (id: number) => {
    try {
      setLoadingDetail(true);
      const detail = await api.getDocumentDetail(id);
      setSelectedDoc(detail);
    } catch (err) {
      console.error('Failed to load document chunks:', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteDocument = async (id: number, title: string) => {
    if (!window.confirm(`Permanently delete '${title}' and remove its vector embeddings?`)) {
      return;
    }
    try {
      await api.deleteDocument(id);
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      await fetchDocuments();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0d1527] border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-violet-400 font-mono text-xs tracking-wider mb-1">
            <BookOpen className="w-4 h-4" />
            <span>GROUNDED COMPLIANCE ENGINE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Compliance Knowledge Base</h1>
          <p className="text-sm text-slate-400 mt-1">
            Ingest, embed, and index Standard Operating Procedures (SOPs) for verifiable safety citations.
          </p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-violet-300">{documents.length}</div>
          <div className="text-xs font-mono text-slate-500">INDEXED MANUALS</div>
        </div>
      </div>

      {/* Upload Box */}
      <div className="p-6 rounded-2xl bg-[#0d1527]/80 border border-dashed border-slate-700 hover:border-violet-500/60 transition">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-violet-400" />
          <span>INGEST NEW REGULATORY / SOP DOCUMENT</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input
            type="text"
            placeholder="Document Title (e.g., SOP-ENV-204 Spill Response)"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
          />

          <select
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="Safety Manual">Safety Manual</option>
            <option value="Chemical Safety">Chemical Safety</option>
            <option value="Fire & Egress">Fire & Egress</option>
            <option value="PPE Standards">PPE Standards</option>
            <option value="Machinery Protocols">Machinery Protocols</option>
          </select>

          <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 cursor-pointer font-mono text-xs font-semibold text-white shadow-glow-violet transition">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'INDEXING...' : 'SELECT PDF, TXT, OR MD'}</span>
            <input
              type="file"
              accept=".pdf,.txt,.md"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {uploadError && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="text-[11px] font-mono text-slate-500">
          Max file size: 10MB. Content is automatically split into semantic chunks and embedded into the hybrid vector index.
        </div>
      </div>

      {/* Search & Document List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search documents by title, filename, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-9 rounded-lg bg-[#0d1527] border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            Querying vector knowledge database...
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0d1527] border border-slate-800 text-slate-400 font-mono text-xs">
            No compliance documents found matching your search.
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0d1527] border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Title & Filename</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Chunks</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredDocs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{doc.title}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" />
                          <span>{doc.filename}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[11px]">
                          {doc.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-violet-400 font-semibold">{doc.chunk_count}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {(doc.file_size_bytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                          <CheckCircle className="w-3 h-3" />
                          <span>{doc.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleViewChunks(doc.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition inline-flex items-center gap-1"
                          title="View Extracted Chunks"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Chunks</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 hover:text-rose-100 transition inline-flex items-center gap-1"
                          title="Purge Document & Embeddings"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Purge</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Chunk Detail Drawer */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[85vh] rounded-2xl bg-[#0d1527] border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <h3 className="font-mono text-sm font-bold text-slate-100">
                  CHUNKS: {selectedDoc.title} ({selectedDoc.chunks.length})
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 font-mono text-xs">
              {selectedDoc.chunks.map((chunk) => (
                <div key={chunk.id} className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-violet-400 font-bold">Chunk #{chunk.chunk_index}</span>
                    <span>Tokens: {chunk.token_count} | Page/Sec: {chunk.page_number ?? '1'}</span>
                  </div>
                  <p className="text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
