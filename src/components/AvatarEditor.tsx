"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface AvatarEditorProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (editedImageBlob: Blob) => void;
}

export default function AvatarEditor({
  imageSrc,
  isOpen,
  onClose,
  onSave,
}: AvatarEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Responsive sizes based on screen size
  const [cropSize, setCropSize] = useState(300);
  const [canvasSize, setCanvasSize] = useState(400);

  // Update sizes on mount and resize
  useEffect(() => {
    const updateSizes = () => {
      const isMobile = window.innerWidth < 768;
      setCropSize(isMobile ? Math.min(window.innerWidth - 80, 280) : 300);
      setCanvasSize(isMobile ? Math.min(window.innerWidth - 40, 360) : 400);
    };
    
    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  // Reset state when image changes
  useEffect(() => {
    if (isOpen && imageSrc) {
      setRotation(0);
      setFlipHorizontal(false);
      setFlipVertical(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isOpen, imageSrc]);

  const loadImage = useCallback(() => {
    if (!imageSrc) {
      setImageError(true);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setImageError(false);
      // Auto-fit image on load
      const imgAspect = img.width / img.height;
      const cropAspect = 1; // circular crop
      if (imgAspect > cropAspect) {
        setScale(cropSize / img.height);
      } else {
        setScale(cropSize / img.width);
      }
      drawImage();
    };
    
    img.onerror = () => {
      console.error("Failed to load image:", imageSrc);
      setImageError(true);
      setImageLoaded(false);
    };
    
    img.src = imageSrc;
  }, [imageSrc, cropSize]);

  useEffect(() => {
    if (isOpen && imageSrc) {
      loadImage();
    }
  }, [isOpen, imageSrc, loadImage]);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // Calculate image dimensions and position
    const img = imageRef.current;
    const imgAspect = img.width / img.height;
    
    let drawWidth = cropSize * scale;
    let drawHeight = cropSize * scale;
    
    if (imgAspect > 1) {
      drawHeight = drawWidth / imgAspect;
    } else {
      drawWidth = drawHeight * imgAspect;
    }

    const centerX = canvasSize / 2 + position.x;
    const centerY = canvasSize / 2 + position.y;

    // Save context state
    ctx.save();

    // Draw the full transformed image
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    
    // Draw image at full opacity
    ctx.globalAlpha = 1.0;
    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );

    ctx.restore();

    // Draw dark overlay outside crop area
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    // Remove overlay from the circular crop area
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;

    // Draw crop circle border
    ctx.beginPath();
    ctx.arc(canvasSize / 2, canvasSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [rotation, flipHorizontal, flipVertical, scale, position, imageLoaded, canvasSize, cropSize]);

  useEffect(() => {
    if (imageLoaded) {
      drawImage();
    }
  }, [rotation, flipHorizontal, flipVertical, scale, position, imageLoaded, drawImage]);

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  const handleFlipHorizontal = () => {
    setFlipHorizontal((prev) => !prev);
  };

  const handleFlipVertical = () => {
    setFlipVertical((prev) => !prev);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  // Touch and mouse handlers
  const getEventPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ('touches' in e) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const pos = getEventPos(e);
    setDragStart({
      x: pos.x - position.x,
      y: pos.y - position.y,
    });
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      e.preventDefault();
      const pos = getEventPos(e);
      setPosition({
        x: pos.x - dragStart.x,
        y: pos.y - dragStart.y,
      });
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !imageLoaded) return;

    // Create a new canvas for the cropped circular image
    const outputSize = 512; // High quality output
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = outputSize;
    outputCanvas.height = outputSize;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Set up circular clipping
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate image dimensions with current scale and transformations
    const img = imageRef.current;
    const imgAspect = img.width / img.height;
    
    let drawWidth = cropSize * scale;
    let drawHeight = cropSize * scale;
    
    if (imgAspect > 1) {
      drawHeight = drawWidth / imgAspect;
    } else {
      drawWidth = drawHeight * imgAspect;
    }

    // Scale position to output canvas size
    const scaleFactor = outputSize / canvasSize;
    const centerX = outputSize / 2 + (position.x * scaleFactor);
    const centerY = outputSize / 2 + (position.y * scaleFactor);
    const scaledDrawWidth = drawWidth * scaleFactor;
    const scaledDrawHeight = drawHeight * scaleFactor;

    // Apply transformations
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    
    // Draw the transformed image
    ctx.drawImage(
      img,
      -scaledDrawWidth / 2,
      -scaledDrawHeight / 2,
      scaledDrawWidth,
      scaledDrawHeight
    );

    // Convert to blob
    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob);
          onClose();
        }
      },
      "image/png",
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4">
      <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-lg bg-background-card border border-border p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-text-primary">
            Edit Profile Picture
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
            aria-label="Close editor"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Loading/Error State */}
        {!imageLoaded && !imageError && (
          <div className="flex items-center justify-center py-12">
            <div className="text-text-secondary">Loading image...</div>
          </div>
        )}

        {imageError && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-red-400 mb-2">Failed to load image</div>
            <button
              onClick={loadImage}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Try again
            </button>
          </div>
        )}

        {/* Canvas Container */}
        {imageLoaded && (
          <div className="mb-6 flex justify-center" ref={containerRef}>
            <div className="relative touch-none">
              <canvas
                ref={canvasRef}
                width={canvasSize}
                height={canvasSize}
                className="rounded-full border-2 border-white/20 bg-transparent touch-none select-none"
                style={{ 
                  backgroundColor: "transparent",
                  maxWidth: "100%",
                  height: "auto"
                }}
                onMouseDown={handleStart}
                onMouseMove={handleMove}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={handleStart}
                onTouchMove={handleMove}
                onTouchEnd={handleEnd}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        {imageLoaded && (
          <div className="space-y-4">
            {/* Instructions */}
            <div className="text-center text-sm text-text-muted mb-2">
              Drag to reposition • Pinch or use buttons to zoom
            </div>

            {/* Rotation */}
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <button
                onClick={handleRotateLeft}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-text-primary transition-colors active:bg-background-card hover:bg-background-card"
                title="Rotate left"
              >
                <span className="block sm:inline">↶</span> <span className="hidden sm:inline">Rotate Left</span>
              </button>
              <button
                onClick={handleRotateRight}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-text-primary transition-colors active:bg-background-card hover:bg-background-card"
                title="Rotate right"
              >
                <span className="hidden sm:inline">Rotate Right </span><span className="block sm:inline">↷</span>
              </button>
            </div>

            {/* Flip */}
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <button
                onClick={handleFlipHorizontal}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-text-primary transition-colors active:bg-background-card hover:bg-background-card"
                title="Flip horizontal"
              >
                <span className="block sm:inline">↔</span> <span className="hidden sm:inline">Flip H</span>
              </button>
              <button
                onClick={handleFlipVertical}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium text-text-primary transition-colors active:bg-background-card hover:bg-background-card"
                title="Flip vertical"
              >
                <span className="block sm:inline">↕</span> <span className="hidden sm:inline">Flip V</span>
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <button
                onClick={handleZoomOut}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-lg font-medium text-text-primary transition-colors active:bg-background-card hover:bg-background-card"
                title="Zoom out"
              >
                −
              </button>
              <span className="text-sm font-medium text-text-secondary min-w-[60px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="rounded-lg border border-border bg-background px-4 py-2.5 text-lg font-medium text-text-primary transition-colors active:bg-background-card hover:bg-background-card"
                title="Zoom in"
              >
                +
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-text-secondary transition-colors active:bg-background-card hover:bg-background-card hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!imageLoaded}
                className="flex-1 rounded-lg bg-text-primary px-4 py-3 text-sm font-medium text-background transition-colors hover:bg-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Photo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
