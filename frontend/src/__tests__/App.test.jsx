import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('Document Editor App', () => {
  it('renders login screen initially', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/email/i)).toBeDefined();
  });
  
  it('allows demo user selection', async () => {
    render(<App />);
    const demoButton = await screen.findByText(/Alice Johnson/i);
    expect(demoButton).toBeDefined();
  });
  
  it('shows document list after login', async () => {
    render(<App />);
    const emailInput = screen.getByPlaceholderText(/email/i);
    await userEvent.type(emailInput, 'alice@example.com');
    
    const loginButton = screen.getByRole('button', { name: /login/i });
    await userEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/new document/i)).toBeDefined();
    });
  });
});