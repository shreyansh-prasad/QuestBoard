"use client";

import { useState, useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  requireConfirmInput?: boolean;
  confirmInputValue?: string;
  confirmInputPlaceholder?: string;
  danger?: boolean;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  requireConfirmInput = false,
  confirmInputValue = "",
  confirmInputPlaceholder = "Type to confirm",
  danger = false,
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setInputValue("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled = requireConfirmInput && inputValue !== confirmInputValue;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div
          className="w-full max-w-md rounded-card border border-border bg-background-card p-6 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title */}
          <h2
            id="modal-title"
            className="mb-4 text-xl font-semibold text-text-primary"
          >
            {title}
          </h2>
          
          {/* Message */}
          <p
            id="modal-description"
            className="mb-4 text-text-secondary"
          >
            {message}
          </p>

          {/* Confirmation Input */}
          {requireConfirmInput && (
            <div className="mb-6">
              <label
                htmlFor="confirm-input"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Type <strong className={danger ? "text-red-400" : "text-text-primary"}>{confirmInputValue}</strong> to confirm:
              </label>
              <input
                id="confirm-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={confirmInputPlaceholder}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-text-primary placeholder:text-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Confirmation input"
              />
            </div>
          )}
          
          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-background-card hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${
                danger
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  : "bg-text-primary hover:bg-text-secondary focus:ring-text-secondary"
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
