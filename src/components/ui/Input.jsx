import { forwardRef } from 'react';
import './FormControls.css';

const Input = forwardRef(function Input(
  {
    label,
    id,
    name,
    type = 'text',
    error,
    helperText,
    required = false,
    className = '',
    ...props
  },
  ref
) {
  const inputId = id || name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const helperId = helperText && inputId ? `${inputId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`comp-field ${className}`}>
      {label && (
        <label htmlFor={inputId} className="comp-label">
          {label}
          {required && <span className="comp-label__required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        name={name || inputId}
        type={type}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`comp-control ${error ? 'comp-control--error' : ''}`}
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

export default Input;
