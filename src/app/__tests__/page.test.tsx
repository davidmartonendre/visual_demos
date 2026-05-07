import { render, screen, fireEvent } from '@testing-library/react';
import Home from '@/app/page';

// Mock the art components
jest.mock('@/components/arts/MorphingBlobs', () => () => <div data-testid="morphing-blobs" />);
jest.mock('@/components/arts/FlowField', () => () => <div data-testid="flow-field" />);
jest.mock('@/components/arts/GrowingCircles', () => () => <div data-testid="growing-circles" />);
jest.mock('@/components/arts/OrganicWaves', () => () => <div data-testid="organic-waves" />);
jest.mock('@/components/arts/ParticleCloud', () => () => <div data-testid="particle-cloud" />);
jest.mock('@/components/arts/CellularGrowth', () => () => <div data-testid="cellular-growth" />);

describe('Home page', () => {
  it('renders all art component buttons', () => {
    render(<Home />);
    
    expect(screen.getAllByTestId('morphing-blobs').length).toBe(2);
    expect(screen.getAllByTestId('flow-field').length).toBe(1);
    expect(screen.getAllByTestId('growing-circles').length).toBe(1);
    expect(screen.getAllByTestId('organic-waves').length).toBe(1);
    expect(screen.getAllByTestId('particle-cloud').length).toBe(1);
    expect(screen.getAllByTestId('cellular-growth').length).toBe(1);
  });

  it('selects an art component when its button is clicked', () => {
    render(<Home />);
    
    const flowFieldButton = screen.getByTestId('flow-field').closest('button');
    fireEvent.click(flowFieldButton);
    
    // After clicking, the large display should show the selected component.
    // We can check if the large component is rendered.
    const allFlowFields = screen.getAllByTestId('flow-field');
    expect(allFlowFields.length).toBe(2);

    const allMorphingBlobs = screen.getAllByTestId('morphing-blobs');
    expect(allMorphingBlobs.length).toBe(1);
  });
});
