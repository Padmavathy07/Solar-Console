import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Solar Console app title', () => {
  render(<App />);
  const titleElement = screen.getAllByText(/SOLAR/i);
  expect(titleElement.length).toBeGreaterThan(0);
});
