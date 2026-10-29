import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '../icons';

const FeedbackContext = createContext(null);

const MAX_TOASTS = 4;

export function AdminFeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextToastId = useRef(1);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (tone, message) => {
      const id = nextToastId.current++;
      setToasts((prev) => [
        ...prev.slice(-(MAX_TOASTS - 1)),
        { id, tone, message },
      ]);
      const duration = tone === 'error' ? 8000 : 4500;
      setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg) => pushToast('success', msg),
      error: (msg) => pushToast('error', msg),
      info: (msg) => pushToast('info', msg),
    }),
    [pushToast]
  );

  // Modal confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState(null);
  const confirmResolver = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      confirmResolver.current = resolve;
      setConfirmDialog({
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'default', // 'default' | 'danger'
      });
    });
  }, []);

  const handleConfirmDecision = useCallback((decision) => {
    if (confirmResolver.current) {
      confirmResolver.current(decision);
      confirmResolver.current = null;
    }
    setConfirmDialog(null);
  }, []);

  // Escape key closes confirm dialog safely
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && confirmDialog) {
        handleConfirmDecision(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmDialog, handleConfirmDecision]);

  const value = useMemo(
    () => ({
      toast,
      confirm,
    }),
    [toast, confirm]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      {/* Toast Floating Stack */}
      <div
        className="admin-toast-container"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const isError = t.tone === 'error';
          const isSuccess = t.tone === 'success';
          return (
            <div
              key={t.id}
              className={`admin-toast-item admin-toast--${t.tone}`}
              role={isError ? 'alert' : 'status'}
            >
              <span className="admin-toast-icon">
                {isSuccess && <CheckCircleIcon size={18} />}
                {isError && <ExclamationCircleIcon size={18} />}
                {!isSuccess && !isError && <InformationCircleIcon size={18} />}
              </span>
              <p className="admin-toast-msg">{t.message}</p>
              <button
                type="button"
                className="admin-toast-dismiss"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
              >
                <XMarkIcon size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Accessible Confirmation Modal Dialog */}
      {confirmDialog && (
        <div
          className="admin-modal-overlay"
          onClick={() => handleConfirmDecision(false)}
        >
          <div
            className="admin-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-confirm-header">
              <h3 id="confirm-dialog-title" className="admin-confirm-title">
                {confirmDialog.title}
              </h3>
            </div>
            <p id="confirm-dialog-desc" className="admin-confirm-desc">
              {confirmDialog.message}
            </p>
            <div className="admin-confirm-actions">
              <button
                type="button"
                className="admin-btn admin-btn--secondary"
                onClick={() => handleConfirmDecision(false)}
                autoFocus
              >
                {confirmDialog.cancelLabel}
              </button>
              <button
                type="button"
                className={`admin-btn ${
                  confirmDialog.tone === 'danger'
                    ? 'admin-btn--danger'
                    : 'admin-btn--primary'
                }`}
                onClick={() => handleConfirmDecision(true)}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useAdminFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useAdminFeedback must be used within an AdminFeedbackProvider');
  }
  return ctx;
}
