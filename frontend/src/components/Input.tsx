import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  helperText?: string;
  unitSuffix?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  unitSuffix,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="w-full mb-4">
      <label
        htmlFor={inputId}
        className="block text-base font-medium text-slate-800 mb-1.5"
      >
        {label}
        {props.required && <span className="text-rose-500 ml-1">*</span>}
      </label>
      <div className="relative rounded-xl shadow-xs">
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-base sm:text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
              : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-100'
          } ${unitSuffix ? 'pr-16' : ''} ${className}`}
          {...props}
        />
        {unitSuffix && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-500 font-medium text-base">
            {unitSuffix}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-sm sm:text-base font-medium text-rose-600 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-sm text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
