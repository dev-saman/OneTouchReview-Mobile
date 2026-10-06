import { fireEvent, render, screen } from '@testing-library/react-native';

import { CodeInput, sanitizeCode } from '../CodeInput';

describe('sanitizeCode', () => {
  it('keeps six digits from typed, pasted or autofilled text', () => {
    expect(sanitizeCode('123456')).toBe('123456');
    expect(sanitizeCode('123 456')).toBe('123456');
    expect(sanitizeCode('Your code: 987-654')).toBe('987654');
    expect(sanitizeCode('12345678')).toBe('123456');
  });
});

describe('CodeInput', () => {
  it('calls onComplete when a full code is pasted', async () => {
    const onChange = jest.fn();
    const onComplete = jest.fn();
    await render(<CodeInput value="" onChange={onChange} onComplete={onComplete} autoFocus={false} />);
    await fireEvent.changeText(screen.getByLabelText('Six-digit code'), '123 456');
    expect(onChange).toHaveBeenCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });
});
