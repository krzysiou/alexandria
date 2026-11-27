import { useRef } from 'react';
import { Search, X } from 'lucide-react';

import { Clear, Field, Input, Trailing } from '@/components/ui-kit/SearchField.styles';
import { useShortcut } from '@/hooks/UseShortcut';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

/**
 * Search input with a clear button. ⌘F focuses it, Esc clears it.
 */
const SearchField = ({ value, onChange, placeholder }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useShortcut(
    event => event.metaKey && event.key.toLowerCase() === 'f',
    () => inputRef.current?.focus(),
  );

  return (
    <Field>
      <Search size={15} />
      <Input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            onChange('');
            inputRef.current?.blur();
          }
        }}
      />
      {value ? (
        <Trailing>
          <Clear onClick={() => onChange('')} aria-label="Clear search">
            <X size={14} />
          </Clear>
        </Trailing>
      ) : null}
    </Field>
  );
};

export { SearchField };
