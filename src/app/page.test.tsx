import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from './page';

// Mock the art components to avoid rendering actual canvas elements
vi.mock('@/components/arts/MorphingBlobs', () => ({ default: () => <div data-testid="morphing-blobs" /> }));
vi.mock('@/components/arts/FlowField', () => ({ default: () => <div data-testid="flow-field" /> }));
vi.mock('@/components/arts/GrowingCircles', () => ({ default: () => <div data-testid="growing-circles" /> }));
vi.mock('@/components/arts/OrganicWaves', () => ({ default: () => <div data-testid="organic-waves" /> }));
vi.mock('@/components/arts/ParticleCloud', () => ({ default: () => <div data-testid="particle-cloud" /> }));
vi.mock('@/components/arts/CellularGrowth', () => ({ default: () => <div data-testid="cellular-growth" /> }));

describe('Home page', () => {
  it('renders all art component buttons', () => {
    render(<Home />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
  });

  it('selects the first art component by default', () => {
    render(<Home />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveClass('ring-2 ring-white');
  });

  it('selects a different art component when its button is clicked', () => {
    render(<Home />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);
    expect(buttons[1]).toHaveClass('ring-2 ring-white');
  });
});
