import * as React from 'react';
import { Input } from './input';

/**
 * Number Input mit deutschem Format (Komma als Dezimaltrennzeichen)
 * Konvertiert automatisch zwischen deutschem Display und JS Number
 */
interface NumberInputDeProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  value: number | '';
  onChange: (value: number) => void;
  decimals?: number;
}

export function NumberInputDe({ 
  value, 
  onChange, 
  decimals = 3,
  className,
  ...props 
}: NumberInputDeProps) {
  const [displayValue, setDisplayValue] = React.useState('');

  // Sync von prop value zu display value
  React.useEffect(() => {
    if (value === '') {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString().replace('.', ','));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setDisplayValue(input);

    // Konvertiere deutsches Format (Komma) zu JS Number (Punkt)
    const normalized = input.replace(',', '.');
    const num = parseFloat(normalized);
    
    if (!isNaN(num)) {
      onChange(num);
    } else if (input === '' || input === '-') {
      onChange(0);
    }
  };

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      className={className}
    />
  );
}
