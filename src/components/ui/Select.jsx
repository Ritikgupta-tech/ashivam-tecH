import { forwardRef } from 'react';
import './FormControls.css';

const Select = forwardRef(function Select(
  {
    label,
    id,
    name,
    error,
    helperText,
    required = false,
    options = [],
    placeholder = 'Select an option',
    className = '',
    children,
    ...props
  },
  ref
) {
  const selectId = id || name;
  const errorId = error && selectId ? `${selectId}-error` : undefined;
  const helperId = helperText && selectId ? `${selectId}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`comp-field ${className}`}>
      {label && (
        <label htmlFor={selectId} className="comp-label">
          {label}
          {required && <span className="comp-label__required" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        name={name || selectId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className={`comp-control comp-select ${error ? 'comp-control--error' : ''}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
        {children}
      </select>
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

export default Select;
