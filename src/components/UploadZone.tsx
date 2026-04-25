import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, optimizeImage } from '../lib/utils';

interface UploadZoneProps {
  label: string;
  description: string;
  onImageUpload: (base64: string | null) => void;
  image: string | null;
  className?: string;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  label,
  description,
  onImageUpload,
  image,
  className
}) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const optimized = await optimizeImage(reader.result as string);
        onImageUpload(optimized);
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false
  });

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
        {label}
      </label>
      <div
        {...getRootProps()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-xl transition-all duration-300 aspect-[3/4] flex flex-col items-center justify-center p-4 bg-slate-50 overflow-hidden",
          isDragActive ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-indigo-400",
          image ? "border-solid bg-transparent" : ""
        )}
      >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          {image ? (
            <motion.div
              key="image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 w-full h-full"
            >
              <img
                src={image}
                alt="Selected"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <p className="text-white text-xs font-bold uppercase tracking-widest">Thay đổi ảnh</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm text-slate-500 font-medium">{description}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {image && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImageUpload(null);
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-white/90 shadow-md flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
