"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

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
  
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  const CANVAS_SIZE = 400;
  const CROP_SIZE = 300; // Circular crop size

  // Reset state when image changes
  useEffect(() => {
    if (isOpen && imageSrc) {
      setRotation(0);
      setFlipHorizontal(false);
      setFlipVertical(false);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [isOpen, imageSrc]);

  const loadImage = useCallback(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      drawImage();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (isOpen && imageSrc) {
      loadImage();
    }
  }, [isOpen, imageSrc, loadImage]);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate image dimensions and position
    const img = imageRef.current;
    const imgAspect = img.width / img.height;
    
    let drawWidth = CROP_SIZE * scale;
    let drawHeight = CROP_SIZE * scale;
    
    if (imgAspect > 1) {
      drawHeight = drawWidth / imgAspect;
    } else {
      drawWidth = drawHeight * imgAspect;
    }

    const centerX = CANVAS_SIZE / 2 + position.x;
    const centerY = CANVAS_SIZE / 2 + position.y;

    // Save context state
    ctx.save();

    // Draw the full transformed image (no clipping, so it renders at full brightness)
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

    // Draw dark overlay outside crop area using composite operations
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Remove overlay from the circular crop area
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;

    // Draw crop circle border
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [rotation, flipHorizontal, flipVertical, scale, position]);

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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    // Create a new canvas for the cropped circular image
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = CROP_SIZE;
    outputCanvas.height = CROP_SIZE;
    const ctx = outputCanvas.getContext("2d");
    if (!ctx) return;

    // Set up circular clipping
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Calculate image dimensions with current scale and transformations
    const img = imageRef.current;
    const imgAspect = img.width / img.height;
    
    let drawWidth = CROP_SIZE * scale;
    let drawHeight = CROP_SIZE * scale;
    
    if (imgAspect > 1) {
      drawHeight = drawWidth / imgAspect;
    } else {
      drawWidth = drawHeight * imgAspect;
    }

    const centerX = CROP_SIZE / 2 + (position.x * CROP_SIZE / CANVAS_SIZE);
    const centerY = CROP_SIZE / 2 + (position.y * CROP_SIZE / CANVAS_SIZE);

    // Apply transformations
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    
    // Draw the transformed image
    ctx.drawImage(
      img,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-card bg-background-card border border-border p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary">
            Edit Profile Picture
          </h2>
          <button
            onClick={onClose}
            className="rounded px-3 py-1 text-sm font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
            aria-label="Close editor"
          >
            ✕
          </button>
        </div>

        {/* Canvas Container */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="cursor-move rounded-full border-2 border-border bg-transparent"
              style={{ backgroundColor: "transparent" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Rotation */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRotateLeft}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card"
              title="Rotate left"
            >
              ↶ Rotate Left
            </button>
            <button
              onClick={handleRotateRight}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card"
              title="Rotate right"
            >
              Rotate Right ↷
            </button>
          </div>

          {/* Flip */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleFlipHorizontal}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card"
              title="Flip horizontal"
            >
              ↔️ Flip Horizontal
            </button>
            <button
              onClick={handleFlipVertical}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card"
              title="Flip vertical"
            >
              ↕️ Flip Vertical
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleZoomOut}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card"
              title="Zoom out"
            >
              ➖ Zoom Out
            </button>
            <span className="text-sm text-text-secondary">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background-card"
              title="Zoom in"
            >
              ➕ Zoom In
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              onClick={onClose}
              className="rounded-lg border border-border bg-background px-6 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background-card hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg bg-text-primary px-6 py-2 text-sm font-medium text-background transition-colors hover:bg-text-secondary"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
