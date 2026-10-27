import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './LoginPage';
import { useAuth } from '../../../../app/auth/services/useAuth';

// Mock useAuth hook
vi.mock('../../../../app/auth/services/useAuth');

describe('LoginPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login page', () => {
    const mockLogin = vi.fn();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
    });

    render(<LoginPage />);
    const loginButton = screen.getByRole('button', { name: /login|sign.*in/i });
    expect(loginButton).toBeTruthy();
  });

  it('should display login button', () => {
    const mockLogin = vi.fn();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
    });

    render(<LoginPage />);
    const loginButton = screen.getByRole('button', { name: /login|sign.*in/i });
    expect(loginButton).toBeTruthy();
  });

  it('should call login function when button clicked', async () => {
    const mockLogin = vi.fn();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
    });

    render(<LoginPage />);
    
    const loginButton = screen.getByRole('button', { name: /login|sign.*in/i });
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalled();
    });
  });

  it('should display branding/logos', () => {
    const mockLogin = vi.fn();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
    });

    render(<LoginPage />);
    
    // Check for images
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('should display welcome message', () => {
    const mockLogin = vi.fn();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: mockLogin,
    });

    render(<LoginPage />);
    
    // Page should render and display at least one heading
    const headings = screen.queryAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });
});
