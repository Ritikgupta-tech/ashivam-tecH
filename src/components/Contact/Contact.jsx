import { useState } from 'react';
import { COMPANY } from '../../data/content';
import { submitInquiry } from '../../api';
import { CheckIcon, MapPinIcon, MailIcon } from '../icons';
import './Contact.css';

const PROJECT_TYPES = [
  'Enterprise Web Application',
  'Mobile Application',
  'Custom Software Architecture',
  'UI/UX Design System',
  'Cloud Backend / API Services',
  'Digital Transformation',
  'Other Engineering Need',
];

const BUDGET_RANGES = [
  'Not Sure Yet',
  'Under ₹50K',
  '₹50K – ₹2L',
  '₹2L – ₹10L',
  '₹10L+',
];

const CONTACT_INFO = [
  {
    icon: <MailIcon size={20} />,
    label: 'Email Inquiries',
    value: COMPANY.email,
    href: `mailto:${COMPANY.email}`,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    ),
    label: 'LinkedIn',
    value: 'Ashivam Technologies',
    href: COMPANY.linkedin,
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
    label: 'GitHub',
    value: 'ashivam-technologies',
    href: COMPANY.github,
  },
  {
    icon: <MapPinIcon size={20} />,
    label: 'Headquarters',
    value: 'Agra, Uttar Pradesh, India',
    subvalue: 'Agra • Uttar Pradesh • India',
    href: null,
  },
];

function FloatingField({ id, name, label, type = 'text', value, onChange, error, required, children }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value;
  const fieldName = name || (id ? id.replace(/^contact-/, '') : undefined);

  return (
    <div className={`form-field${active ? ' form-field--active' : ''}${error ? ' form-field--error' : ''}`}>
      <label htmlFor={id} className="form-field__label">{label}{required && <span aria-hidden="true"> *</span>}</label>
      {children || (
        <input
          id={id}
          name={fieldName}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="form-field__input"
          required={required}
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={!!error}
        />
      )}
      {error && <span id={`${id}-error`} className="form-field__error" role="alert">{error}</span>}
    </div>
  );
}

function SelectField({ id, name, label, value, onChange, error, required, options }) {
  const [focused, setFocused] = useState(false);
  const active = focused || value;
  const fieldName = name || (id ? id.replace(/^contact-/, '') : undefined);

  return (
    <div className={`form-field${active ? ' form-field--active' : ''}${error ? ' form-field--error' : ''}`}>
      <label htmlFor={id} className="form-field__label">{label}{required && <span aria-hidden="true"> *</span>}</label>
      <select
        id={id}
        name={fieldName}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="form-field__input form-field__select"
        required={required}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
      >
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {error && <span id={`${id}-error`} className="form-field__error" role="alert">{error}</span>}
    </div>
  );
}

export default function Contact() {
  const [form, setForm] = useState({
    name: '', email: '', company: '', projectType: '', budget: '', message: '',
  });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Please enter a valid email address.';
    if (!form.message.trim()) e.message = 'Message is required.';
    else if (form.message.trim().length < 10) e.message = 'Message should be at least 10 characters.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStatus('loading');

    const subject = [form.projectType, form.budget]
      .filter(Boolean)
      .join(' - ') || 'Website inquiry';
    const message = [
      form.company.trim() ? `Company: ${form.company.trim()}` : '',
      form.message.trim(),
    ].filter(Boolean).join('\n\n');

    try {
      await submitInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        subject,
        message,
      });
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrors({ form: error.message || 'Unable to submit your message. Please try again.' });
    }
  };

  if (status === 'success') {
    return (
      <section className="contact section" id="contact" aria-labelledby="contact-heading">
        <div className="container">
          <div className="contact__success" role="status" aria-live="polite">
            <div className="contact__success-icon">
              <CheckIcon size={36} className="contact__check-svg" />
            </div>
            <h2 className="gradient-text-gold">Inquiry Received</h2>
            <p>Thank you for reaching out to Ashivam Technologies. Our engineering leads will review your inquiry and respond shortly.</p>
            <button
              className="btn btn-outline"
              onClick={() => {
                setStatus('idle');
                setForm({ name: '', email: '', company: '', projectType: '', budget: '', message: '' });
              }}
            >
              Send Another Inquiry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="contact section" id="contact" aria-labelledby="contact-heading">
      <div className="container">
        <div className="contact__header">
          <p className="section-label reveal">Direct Engagement</p>
          <h2 id="contact-heading" className="reveal reveal--delay-1">
            Let's Build <span className="gradient-text-gold">Together</span>
          </h2>
          <p className="contact__subtitle reveal reveal--delay-2">
            Discuss your enterprise technology requirements, platform roadmap, or product engineering needs.
          </p>
        </div>

        <div className="contact__inner">
          {/* Form */}
          <form
            className="contact__form reveal reveal--delay-2"
            onSubmit={handleSubmit}
            noValidate
            aria-label="Contact and inquiry form"
          >
            <div className="contact__form-row">
              <FloatingField id="contact-name" name="name" label="Full Name" value={form.name} onChange={set('name')} error={errors.name} required />
              <FloatingField id="contact-email" name="email" label="Business Email" type="email" value={form.email} onChange={set('email')} error={errors.email} required />
            </div>
            <FloatingField id="contact-company" name="company" label="Company / Organization" value={form.company} onChange={set('company')} error={errors.company} />
            <div className="contact__form-row">
              <SelectField id="contact-project-type" name="projectType" label="Project Classification" value={form.projectType} onChange={set('projectType')} error={errors.projectType} options={PROJECT_TYPES} />
              <SelectField id="contact-budget" name="budget" label="Investment Range" value={form.budget} onChange={set('budget')} error={errors.budget} options={BUDGET_RANGES} />
            </div>
            <FloatingField id="contact-message" name="message" label="Project Overview & Requirements" value={form.message} onChange={set('message')} error={errors.message} required>
              <textarea
                id="contact-message"
                name="message"
                value={form.message}
                onChange={set('message')}
                className="form-field__input form-field__textarea"
                rows={5}
                required
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                aria-invalid={!!errors.message}
              />
            </FloatingField>
            <button
              type="submit"
              className="btn btn-primary contact__submit"
              disabled={status === 'loading'}
              id="contact-submit"
            >
              {status === 'loading' ? (
                <>
                  <span className="contact__spinner" aria-hidden="true" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <span>Transmit Inquiry</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="22" y1="2" x2="11" y2="13" strokeLinecap="round" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </>
              )}
            </button>
            {errors.form && <p className="form-field__error" role="alert">{errors.form}</p>}
          </form>

          {/* Info cards */}
          <div className="contact__info reveal reveal--right reveal--delay-3">
            <div className="contact__info-header">
              <h3>Headquarters & Channels</h3>
              <p>Headquartered in Agra, Uttar Pradesh, India. Reach out directly through any of our verified communications channels.</p>
            </div>
            <div className="contact__info-cards">
              {CONTACT_INFO.map((info) => (
                <div key={info.label} className="contact-info-card">
                  <div className="contact-info-card__icon" aria-hidden="true">{info.icon}</div>
                  <div>
                    <div className="contact-info-card__label">{info.label}</div>
                    {info.href ? (
                      <a href={info.href} className="contact-info-card__value" target={info.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
                        {info.value}
                      </a>
                    ) : (
                      <span className="contact-info-card__value">{info.value}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
