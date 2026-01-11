import React, { useRef } from 'react';
import { Upload } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  dragActive: boolean;
  setDragActive: (active: boolean) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, dragActive, setDragActive }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 group ${
        dragActive
          ? "border-primary bg-primary/10"
          : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
        <Upload className="w-8 h-8 text-primary" />
      </div>
      <p className="text-lg font-medium mb-2">Drop your audio file here</p>
      <p className="text-sm text-muted-foreground">or click to browse</p>
      <p className="text-xs text-muted-foreground mt-4">Supports MP3, WAV, FLAC, M4A, OGG</p>
    </div>
  );
};

export default FileUpload;
