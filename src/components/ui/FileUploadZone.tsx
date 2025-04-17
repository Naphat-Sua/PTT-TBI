
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, File } from 'lucide-react';

interface FileUploadZoneProps {
  onFileUpload: (file: File) => void;
  acceptedFileTypes?: Record<string, string[]>;
  maxFiles?: number;
  icon?: 'upload' | 'spreadsheet' | 'document';
  label?: string;
  sublabel?: string;
  isProcessing?: boolean;
  error?: string | null;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileUpload,
  acceptedFileTypes,
  maxFiles = 1,
  icon = 'upload',
  label = 'Drag & drop a file here, or click to select',
  sublabel = 'Supported formats: Various file types',
  isProcessing = false,
  error = null
}) => {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      onFileUpload(acceptedFiles[0]);
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles,
    // Add noClick: false to ensure it responds to clicks
    noClick: false,
    // Add additional configuration to improve responsiveness
    useFsAccessApi: false,
    preventDropOnDocument: true
  });

  const renderIcon = () => {
    switch (icon) {
      case 'spreadsheet':
        return <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
      case 'document':
        return <File className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
      case 'upload':
      default:
        return <Upload className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
    }
  };

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors shadow-sm hover:shadow-md
        ${
          isDragActive
            ? 'border-apple-blue bg-blue-50 dark:bg-blue-900/10'
            : 'border-gray-300 dark:border-gray-700 hover:border-apple-blue dark:hover:border-apple-highlight'
        }`}
    >
      <input {...getInputProps()} />
      {renderIcon()}

      {isProcessing ? (
        <p className="text-gray-600 dark:text-gray-300">Processing file...</p>
      ) : (
        <>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">{label}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{sublabel}</p>
        </>
      )}

      {error && <p className="mt-3 text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default FileUploadZone;
