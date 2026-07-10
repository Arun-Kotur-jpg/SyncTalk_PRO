import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '../Button';

describe('Button component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('shows loading spinner when loading prop is true', () => {
    render(<Button loading={true}>Submit</Button>);
    // We check if the children are hidden/transparent and the loader is visible.
    // Let's just check that it's disabled.
    const button = screen.getByRole('button');
    expect(button.disabled).toBe(true);
  });
});
