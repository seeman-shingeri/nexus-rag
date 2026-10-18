import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Trash2, 
  Search, 
  Eye, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Layers,
  X,
  RefreshCw,
  Plus
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
  const [categoryInput, setCategoryInput] = useState('Safety SOP');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.warn('Failed to fetch documents from API');
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

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File exceeds maximum allowed size of 20MB.');
      return;
    }

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
      setIsUploadOpen(false);
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
      console.warn('Failed to load document chunks');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeleteDocument = async (id: number, title: string) => {
    if (!window.confirm(`Permanently remove document '${title}' and purge its vector embeddings from the database?`)) {
      return;
    }
    try {
      await api.deleteDocument(id);
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      await fetchDocuments();
    } catch (err) {
      console.warn('Failed to delete document');
    }
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Knowledge Base & Safety SOPs</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest, vectorize, and index standard operating procedures for grounded retrieval in incident triage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsUploadOpen(!isUploadOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium tracking-wide transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Drawer / Section */}
      {isUploadOpen && (
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-900 uppercase font-mono">
              Upload Standard Operating Procedure
            </span>
            <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Document Title (Optional)</label>
              <input
                type="text"
                placeholder="e.g. SOP-ENV-204: Chemical Spill Response"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Safety Category</label>
              <select
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
              >
                <option value="Safety SOP">Safety SOP</option>
                <option value="Chemical Safety">Chemical Safety</option>
                <option value="Security Protocol">Security Protocol</option>
                <option value="Fire & Egress">Fire & Egress</option>
                <option value="Equipment Handling">Equipment Handling</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">File (PDF, MD, TXT - Max 20MB)</label>
              <input
                type="file"
                accept=".pdf,.md,.txt,.markdown"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
              />
            </div>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-xs font-mono text-blue-700 pt-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Extracting text, chunking into segments, and computing vector embeddings...</span>
            </div>
          )}
        </div>
      )}

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search indexed safety procedures by title, filename, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        <span className="text-xs font-mono text-slate-500 whitespace-nowrap">
          {filteredDocs.length} Documents Registered
        </span>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs font-mono">
            {loading ? 'Querying document vector database...' : 'No documents found matching search criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/60 font-mono text-[11px]">
                  <th className="py-2.5 px-4 font-medium">Document Title</th>
                  <th className="py-2.5 px-4 font-medium">Category</th>
                  <th className="py-2.5 px-4 font-medium">Type</th>
                  <th className="py-2.5 px-4 font-medium">Size</th>
                  <th className="py-2.5 px-4 font-medium">Chunks</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{doc.filename}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700">{doc.category}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] uppercase text-slate-500">{doc.file_type}</td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {(doc.file_size_bytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-800 font-semibold">
                      {doc.chunk_count} Chunks
                    </td>
                    <td className="py-2.5 px-4">
                      {doc.status === 'INDEXED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          INDEXED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          {doc.status}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewChunks(doc.id)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium transition"
                        >
                          Chunks
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.title)}
                          className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chunk Inspector Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-lg bg-white border border-slate-200 shadow-xl overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{selectedDoc.title}</h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {selectedDoc.filename} · {selectedDoc.chunks.length} Extracted Vector Chunks
                </span>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              {selectedDoc.chunks.map((chunk) => (
                <div key={chunk.id} className="p-3.5 rounded border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500 border-b border-slate-200/60 pb-1">
                    <span>Chunk #{chunk.chunk_index}</span>
                    <span>Tokens: ~{chunk.token_count}</span>
                  </div>
                  <p className="text-slate-800 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                    {chunk.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
