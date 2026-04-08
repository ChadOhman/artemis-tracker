"use client";
import { useState, useCallback } from "react";

interface ConfirmState {
  message: string;
  onConfirm: () => Promise<void> | void;
}

interface ActionFeedback {
  type: "success" | "error";
  message: string;
}

/**
 * Hook that provides confirm + feedback behavior for admin actions.
 * Returns: { confirm, feedback, ConfirmDialog, FeedbackBanner, showSuccess, showError, clearFeedback }
 */
export function useAdminAction() {
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  const confirm = useCallback((message: string, onConfirm: () => Promise<void> | void) => {
    setConfirmState({ message, onConfirm });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmState) return;
    setConfirmState(null);
    try {
      await confirmState.onConfirm();
    } catch (err: any) {
      setFeedback({ type: "error", message: err?.message || "Action failed" });
    }
  }, [confirmState]);

  const handleCancel = useCallback(() => {
    setConfirmState(null);
  }, []);

  const showSuccess = useCallback((message: string) => {
    setFeedback({ type: "success", message });
    setTimeout(() => setFeedback(null), 3000);
  }, []);

  const showError = useCallback((message: string) => {
    setFeedback({ type: "error", message });
  }, []);

  const clearFeedback = useCallback(() => setFeedback(null), []);

  function ConfirmDialog() {
    if (!confirmState) return null;
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
      }}>
        <div style={{
          maxWidth: 400,
          width: "90%",
          background: "#0d1520",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          borderRadius: 10,
          padding: "28px 24px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 14, color: "#e0e8f0", marginBottom: 20, lineHeight: 1.6 }}>
            {confirmState.message}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={handleCancel}
              style={{
                padding: "8px 20px",
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: 6,
                color: "#8a9aaa",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              style={{
                padding: "8px 20px",
                background: "rgba(0, 229, 255, 0.15)",
                border: "1px solid rgba(0, 229, 255, 0.4)",
                borderRadius: 6,
                color: "#00e5ff",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Yes, I'm sure
            </button>
          </div>
        </div>
      </div>
    );
  }

  function FeedbackBanner() {
    if (!feedback) return null;
    const isSuccess = feedback.type === "success";
    return (
      <div style={{
        padding: "10px 14px",
        background: isSuccess ? "rgba(0, 255, 136, 0.08)" : "rgba(255, 68, 85, 0.08)",
        border: `1px solid ${isSuccess ? "rgba(0, 255, 136, 0.3)" : "rgba(255, 68, 85, 0.3)"}`,
        borderRadius: 4,
        fontSize: 12,
        color: isSuccess ? "#00ff88" : "#ff4455",
        fontFamily: "'JetBrains Mono', monospace",
        marginTop: 12,
        cursor: isSuccess ? "default" : "pointer",
      }}
        onClick={isSuccess ? undefined : clearFeedback}
      >
        {feedback.message}
        {!isSuccess && <span style={{ float: "right", opacity: 0.5 }}>&times;</span>}
      </div>
    );
  }

  return { confirm, showSuccess, showError, feedback, ConfirmDialog, FeedbackBanner, clearFeedback };
}
