'use client';

import { useState, useRef, useCallback } from 'react';

interface Document {
  id: string;
  nom: string;
  nomOriginal: string;
  url: string;
  type: string;
  taille: number;
  uploadedAt: string;
}

interface DocumentUploadProps {
  dossierId: string;
  onUploadSuccess?: (doc: Document) => void;
  onUploadError?: (error: string) => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const MAX_SIZE_MB = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function fileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('word')) return '📝';
  return '📎';
}

export default function DocumentUpload({
  dossierId,
  onUploadSuccess,
  onUploadError,
}: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Type de fichier non autorisé. PDF, images (JPG/PNG) et Word uniquement.';
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `La taille maximale est ${MAX_SIZE_MB} Mo. Ce fichier fait ${formatBytes(file.size)}.`;
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
    if (!nom) setNom(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nom]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setProgress('Téléversement en cours...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('nom', nom || selectedFile.name);

      const res = await fetch(`/api/dossiers/${dossierId}/documents`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Erreur lors du téléversement');
      }

      const document: Document = await res.json();
      setProgress('Téléversement réussi !');
      setSelectedFile(null);
      setNom('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.(document);

      // Reset progress after a moment
      setTimeout(() => setProgress(''), 3000);
    } catch (err: any) {
      const msg = err.message ?? 'Erreur inconnue';
      setError(msg);
      setProgress('');
      onUploadError?.(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setNom('');
    setError(null);
    setProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={[
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : selectedFile
            ? 'border-green-400 bg-green-50 cursor-default'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={handleInputChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-1">
            <p className="text-2xl">{fileIcon(selectedFile.type)}</p>
            <p className="font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">{formatBytes(selectedFile.size)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-3xl text-gray-400">📁</p>
            <p className="text-sm font-medium text-gray-700">
              Glissez-déposez un fichier ici ou{' '}
              <span className="text-blue-600 underline">parcourez</span>
            </p>
            <p className="text-xs text-gray-400">
              PDF, JPG, PNG, Word — max {MAX_SIZE_MB} Mo
            </p>
          </div>
        )}
      </div>

      {/* Document name field (shown when file is selected) */}
      {selectedFile && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nom du document
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom affiché dans le dossier"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Progress */}
      {progress && !error && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {progress}
        </p>
      )}

      {/* Actions */}
      {selectedFile && (
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? 'Téléversement...' : 'Téléverser'}
          </button>
          <button
            onClick={handleCancel}
            disabled={uploading}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
