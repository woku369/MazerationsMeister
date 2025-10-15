import React, { useState } from 'react';
import { Button } from './button';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Uhrzeit wählen",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleTimeSelect = (timeString: string) => {
    onChange?.(timeString);
    setIsOpen(false);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return placeholder;
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  // Generate time options (every 15 minutes)
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(timeString);
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-10",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatTime(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <div className="grid grid-cols-4 gap-1 max-h-60 overflow-y-auto">
            {timeOptions.map((timeString) => (
              <Button
                key={timeString}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  value === timeString && "bg-accent text-accent-foreground"
                )}
                onClick={() => handleTimeSelect(timeString)}
              >
                {formatTime(timeString)}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
