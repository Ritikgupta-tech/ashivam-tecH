import { forwardRef } from 'react';
import './FormControls.css';

const Textarea = forwardRef(function Textarea(
  {
    label,
    id,
    name,
    error,
    helperText,
    required = false,
    className = '',
    rows = 4,
    ...props
  },
  ref
) {
  const textareaId = id || name;
  const errorId = error && textareaId ? `${textareaId}-error` : undefined;
  const helperId = helperText && textareaId ? `${textareaId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`comp-field ${className}`}>
      {label && (
        <label htmlFor={textareaId} className="comp-label">
          {label}
          {required && <span className="comp-label__required" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        name={name || textareaId}
        rows={rows}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`comp-control comp-textarea ${error ? 'comp-control--error' : ''}`}
        {...props}
      />
      {error && (
        <span id={errorId} className="comp-error-message" role="alert">
          {error}
        </span>
      )}
      {!error && helperText && (
        <span id={helperId} className="comp-helper-text">
          {helperText}
        </span>
      )}
    </div>
  );
});

export default Textarea;
