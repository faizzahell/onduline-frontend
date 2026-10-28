import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  'aria-label': ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Escape must close the dropdown and return focus to the trigger, so that
    // keyboard navigation does not get trapped inside the list.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        className="w-full inline-flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-amber-300 bg-white font-bold text-slate-800 text-xs shadow-2xs hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D32F2F] focus:border-[#D32F2F] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white"
      >
        <span className="truncate">
          {selectedOption ? (
            <span>
              {selectedOption.label}
              {selectedOption.sublabel && (
                <span className="font-normal text-slate-500 ml-1.5">
                  ({selectedOption.sublabel})
                </span>
              )}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white border border-slate-100 shadow-xl z-50 overflow-hidden py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
          <ul
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel ?? placeholder}
            className="max-h-56 overflow-y-auto divide-y divide-slate-50"
          >
            {options.map((option) => {
              const isSelected = option.value === value;

              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => selectOption(option.value)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between transition cursor-pointer focus:outline-none focus-visible:bg-slate-100 ${
                      isSelected
                        ? 'bg-red-50/60 text-[#D32F2F] font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 pr-2">
                      <span className="block truncate">{option.label}</span>
                      {option.sublabel && (
                        <span className="block text-[10px] text-slate-400 font-normal truncate mt-0.5">
                          {option.sublabel}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check
                        aria-hidden="true"
                        className="w-4 h-4 text-[#D32F2F] shrink-0 stroke-[2.5]"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
