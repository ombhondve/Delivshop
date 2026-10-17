import React, { useState, useRef, useEffect, useId } from 'react';
import { Search, MapPin, X, ChevronDown, Check } from 'lucide-react';

export interface AutocompleteOption {
  label: string;
  value: string;
  secondary?: string;
  badge?: string;
}

interface AutocompleteInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: 'map-pin' | 'search';
  id?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSelect,
  options,
  placeholder = 'Type to search...',
  disabled = false,
  required = false,
  error,
  hint,
  icon = 'map-pin',
  id: customId,
}) => {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when options change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [options]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll('.autocomplete-item');
      const item = items[highlightedIndex] as HTMLElement;
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (options.length === 0) return;
      setHighlightedIndex((prev) =>
        prev < options.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (options.length === 0) return;
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : options.length - 1
      );
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
        e.preventDefault();
        handleOptionClick(options[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleOptionClick = (option: AutocompleteOption) => {
    onChange(option.value);
    onSelect(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="form-group"
      style={{ position: 'relative', marginBottom: '14px' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '5px',
        }}
      >
        <label
          htmlFor={inputId}
          className={`form-label ${required ? 'required' : ''}`}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1E293B',
            margin: 0,
          }}
        >
          {label}
        </label>
        {hint && (
          <span style={{ fontSize: '11px', color: '#64748B' }}>{hint}</span>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            position: 'absolute',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            color: error ? '#DC2626' : '#16805D',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {icon === 'map-pin' ? <MapPin size={16} /> : <Search size={16} />}
        </span>

        <input
          id={inputId}
          ref={inputRef}
          type="text"
          className={`form-control ${error ? 'is-invalid' : ''}`}
          style={{
            paddingLeft: '36px',
            paddingRight: value ? '54px' : '32px',
            height: '40px',
            fontSize: '13.5px',
            borderRadius: '6px',
            border: error
              ? '1.5px solid #EF4444'
              : isOpen
              ? '1.5px solid #16805D'
              : '1px solid #A7AE9F',
            backgroundColor: disabled ? '#F1F5F9' : '#FFFFFF',
            boxShadow: isOpen ? '0 0 0 3px rgba(22, 128, 93, 0.12)' : 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            width: '100%',
          }}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (!disabled) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />

        <div
          style={{
            position: 'absolute',
            right: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            zIndex: 2,
          }}
        >
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear input"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                borderRadius: '50%',
              }}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              color: '#94A3B8',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronDown
              size={15}
              style={{
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>
        </div>
      </div>

      {error && (
        <span
          className="input-error-text"
          style={{
            color: '#DC2626',
            fontSize: '12px',
            marginTop: '4px',
            display: 'block',
            fontWeight: 500,
          }}
        >
          {error}
        </span>
      )}

      {/* Autocomplete Dropdown List */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="autocomplete-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '230px',
            overflowY: 'auto',
            background: '#FFFFFF',
            border: '1px solid #A7AE9F',
            borderRadius: '8px',
            boxShadow:
              '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1050,
            padding: '4px 0',
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: '12px 16px',
                fontSize: '13px',
                color: '#64748B',
                textAlign: 'center',
              }}
            >
              No matching locations found
            </div>
          ) : (
            options.map((option, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected =
                option.value.toLowerCase() === value.toLowerCase();

              return (
                <div
                  key={`${option.value}-${idx}`}
                  className={`autocomplete-item ${
                    isHighlighted ? 'highlighted' : ''
                  }`}
                  style={{
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isHighlighted
                      ? '#F0FDF4'
                      : isSelected
                      ? '#F8FAFC'
                      : '#FFFFFF',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    // Prevent blur before selection
                    e.preventDefault();
                    handleOptionClick(option);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin
                      size={14}
                      color={isHighlighted || isSelected ? '#16805D' : '#94A3B8'}
                    />
                    <div>
                      <strong
                        style={{
                          fontSize: '13px',
                          color: isHighlighted || isSelected ? '#16805D' : '#1E293B',
                          fontWeight: isSelected ? 700 : 600,
                        }}
                      >
                        {option.label}
                      </strong>
                      {option.secondary && (
                        <span
                          style={{
                            fontSize: '11.5px',
                            color: '#64748B',
                            marginLeft: '6px',
                          }}
                        >
                          ({option.secondary})
                        </span>
                      )}
                    </div>
                  </div>

                  {option.badge && (
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#DCFCE7',
                        color: '#16805D',
                        fontWeight: 600,
                      }}
                    >
                      {option.badge}
                    </span>
                  )}
                  {isSelected && (
                    <Check size={14} color="#16805D" style={{ marginLeft: '6px' }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

