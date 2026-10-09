import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Download, RotateCcw, RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';

export interface ImageViewerModalProps {
  isOpen: boolean;
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageViewerModal({ isOpen, src, alt = 'Image Preview', onClose }: ImageViewerModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === '=' || e.key === '+') setZoom((z) => Math.min(z + 0.25, 4));
      else if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
      else if (e.key === 'r' || e.key === 'R') setRotation((r) => (r + 90) % 360);
      else if (e.key === '0') {
        setZoom(1);
        setRotation(0);
        setPosition({ x: 0, y: 0 });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !src || typeof window === 'undefined') return null;

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => (e.deltaY < 0 ? Math.min(z + 0.2, 4) : Math.max(z - 0.2, 0.5)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = alt.replace(/\s+/g, '_') || 'image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, '_blank');
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60000] w-screen h-screen bg-black/92 backdrop-blur-md flex flex-col justify-between select-none overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-6 py-4 z-10 shrink-0 bg-gradient-to-b from-black/60 to-transparent" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm font-medium text-white/80 truncate max-w-[50vw]">{alt}</span>
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/15">
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer border-0 bg-transparent p-0"
            onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer border-0 bg-transparent p-0"
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer border-0 bg-transparent p-0"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate 90° (R)"
          >
            <RotateCw className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer border-0 bg-transparent p-0"
            onClick={() => {
              setZoom(1);
              setRotation(0);
              setPosition({ x: 0, y: 0 });
            }}
            title="Reset (0)"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer border-0 bg-transparent p-0"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="w-4.5 h-4.5" />
          </button>
          <div className="w-[1px] h-5 bg-white/20 my-auto" />
          <button
            type="button"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-red-500/80 transition-colors cursor-pointer border-0 bg-transparent p-0"
            onClick={onClose}
            title="Close (Esc)"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-2"
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-[85vw] max-h-[82vh] object-contain transition-transform duration-100 ease-out shadow-2xl rounded-xl border border-white/10 pointer-events-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
        />
      </div>

      <div className="flex items-center justify-center px-6 py-3 shrink-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
        <span className="text-xs text-white/60 font-mono">
          Zoom: {Math.round(zoom * 100)}% | Rotation: {rotation}°
        </span>
      </div>
    </div>,
    document.body
  );
}

export default ImageViewerModal;
