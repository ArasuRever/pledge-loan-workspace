import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function ImageViewerModal({ isOpen, onClose, src, title = "Item Photograph" }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      document.body.style.overflow = 'hidden';
      const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !src) return null;

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.3, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.3, 0.5));
  const handleReset = () => setScale(1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-fadeIn">
      {/* Top Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-3 text-white border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition shadow-xs"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition shadow-xs"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl transition shadow-xs"
            title="Reset Zoom (1:1)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl transition shadow-xs ml-2"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Zoom Viewport */}
      <div 
        className="relative flex-1 w-full max-w-4xl flex items-center justify-center overflow-auto p-4 cursor-grab active:cursor-grabbing"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <img
          src={src}
          alt={title}
          style={{ transform: `scale(${scale})`, transition: 'transform 0.15s ease-out' }}
          className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl select-none"
        />
      </div>

      <p className="text-[11px] text-slate-500 pt-2">
        Click + / - to inspect hallmarks and gold markings. Press Esc or click outside to close.
      </p>
    </div>
  );
}