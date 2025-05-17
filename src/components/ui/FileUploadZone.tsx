import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, File, FileImage, FileText, AlertCircle } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  onFileUpload?: (file: File) => void; // Add this prop for backward compatibility
  acceptedFileTypes?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number; // Maximum file size in bytes
  icon?: 'upload' | 'spreadsheet' | 'document' | 'image' | 'text';
  label?: string;
  sublabel?: string;
  isProcessing?: boolean;
  error?: string | null;
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFilesAdded,
  onFileUpload, // Add this prop
  acceptedFileTypes,
  maxFiles = 1,
  maxSize = 50 * 1024 * 1024, // Default to 50MB max file size
  icon = 'upload',
  label = 'Drag & drop a file here, or click to select',
  sublabel = 'Supported formats: Various file types',
  isProcessing = false,
  error = null
}) => {
  const [uploadError, setUploadError] = useState<string | null>(error);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      
      setUploadError(null);
      
      // Support both callback types
      onFilesAdded(acceptedFiles);
      
      // If onFileUpload is provided, call it with the first file
      if (onFileUpload && acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFilesAdded, onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles,
    maxSize, // Set the max file size
    // Add noClick: false to ensure it responds to clicks
    noClick: false,
    // Add additional configuration to improve responsiveness
    useFsAccessApi: false,
    preventDropOnDocument: true,
    onDropRejected: (rejections) => {
      if (rejections.length > 0) {
        const rejection = rejections[0];
        if (rejection.errors.some(err => err.code === 'file-too-large')) {
          const fileSize = (rejection.file.size / (1024 * 1024)).toFixed(2);
          setUploadError(`File too large: ${fileSize}MB. Maximum size is ${(maxSize / (1024 * 1024)).toFixed(2)}MB.`);
        } else if (rejection.errors.some(err => err.code === 'file-invalid-type')) {
          setUploadError('Invalid file type. Please check supported formats.');
        } else {
          setUploadError('File upload failed. Please try again.');
        }
      }
    }
  });

  // Format size to human readable format
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const renderIcon = () => {
    switch (icon) {
      case 'spreadsheet':
        return <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
      case 'document':
        return <File className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
      case 'image':
        return <FileImage className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
      case 'text':
        return <FileText className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
      case 'upload':
      default:
        return <Upload className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />;
    }
  };

  // Use component state error or prop error
  const displayError = uploadError || error;

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors shadow-lg hover:shadow-xl
        ${
          isDragActive
            ? 'border-[#FFD700] bg-yellow-50 dark:bg-yellow-900/10'
            : 'border-gray-300 dark:border-gray-700 hover:border-[#FFD700] dark:hover:border-[#FFD700]'
        }
        ${displayError ? 'border-red-400 dark:border-red-600' : ''}
        `}
    >
      <input {...getInputProps()} />
      {renderIcon()}

      {isProcessing ? (
        <div className="flex flex-col items-center">
          <p className="text-gray-600 dark:text-gray-300 mb-2">Processing file...</p>
          <div className="w-40 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FF8C00] rounded-full animate-pulse" style={{ width: '60%' }}></div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg font-medium text-gray-700 dark:text-gray-200">{label}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{sublabel}</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Max size: {formatSize(maxSize)}</p>
        </>
      )}

      {displayError && (
        <div className="mt-3 flex items-center justify-center text-red-500 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mr-1.5" />
          <p>{displayError}</p>
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
