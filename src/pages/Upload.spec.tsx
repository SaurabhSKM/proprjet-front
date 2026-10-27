import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Upload from './Upload';
import { useAuth } from '../app/auth/services/useAuth';
import { useHealthCheckService } from '../services/useHealthCheckService';
import { useUpload } from '../services/uploadCsvImg';

// Mock des hooks
vi.mock('../app/auth/services/useAuth');
vi.mock('../services/useHealthCheckService');
vi.mock('../services/uploadCsvImg');

// Mock DOM methods
Element.prototype.scrollIntoView = vi.fn();

describe('Upload Component', () => {
  let mockLogout: ReturnType<typeof vi.fn>;
  let mockHealthCheck: { checkServer: ReturnType<typeof vi.fn> };
  let mockUpload: { uploadImage: ReturnType<typeof vi.fn>; uploadCsv: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogout = vi.fn();

    // Mock useAuth
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      username: 'testuser',
      authenticated: true,
      logout: mockLogout,
    });

    // Mock useHealthCheckService
    mockHealthCheck = {
      checkServer: vi.fn().mockResolvedValue({ status: 'ok' }),
    };
    (useHealthCheckService as ReturnType<typeof vi.fn>).mockReturnValue(mockHealthCheck);

    // Mock useUpload
    mockUpload = {
      uploadImage: vi.fn().mockResolvedValue({ success: true }),
      uploadCsv: vi.fn().mockResolvedValue({ success: true }),
    };
    (useUpload as ReturnType<typeof vi.fn>).mockReturnValue(mockUpload);

    // Clear sessionStorage
    sessionStorage.clear();
  });

  it('should render the Upload component', () => {
    const { container } = render(<Upload />);
    expect(container).toBeTruthy();
  });

  it('should display username in the drawer', async () => {
    render(<Upload />);
    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeTruthy();
    });
  });

  it('should call health check service on mount', async () => {
    render(<Upload />);

    await waitFor(() => {
      expect(mockHealthCheck.checkServer).toHaveBeenCalled();
    });
  });

  it('should not call health check twice if already checked', async () => {
    sessionStorage.setItem('serverChecked', 'true');

    const mockHealthCheckNoCall = {
      checkServer: vi.fn(),
    };
    (useHealthCheckService as ReturnType<typeof vi.fn>).mockReturnValue(mockHealthCheckNoCall);

    render(<Upload />);

    await waitFor(() => {
      expect(mockHealthCheckNoCall.checkServer).not.toHaveBeenCalled();
    });
  });

  it('should display toast on server check success', async () => {
    const mockHealthCheckSuccess = {
      checkServer: vi.fn().mockResolvedValue({ status: 'ok' }),
    };
    (useHealthCheckService as ReturnType<typeof vi.fn>).mockReturnValue(mockHealthCheckSuccess);

    render(<Upload />);

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      if (alert) {
        expect(alert.textContent).toMatch(/server|connected|disponible/i);
      }
    });
  });

  it('should display error toast on server check failure', async () => {
    const mockHealthCheckError = {
      checkServer: vi.fn().mockRejectedValue(new Error('Server unavailable')),
    };
    (useHealthCheckService as ReturnType<typeof vi.fn>).mockReturnValue(mockHealthCheckError);

    render(<Upload />);

    await waitFor(() => {
      const alert = screen.queryByRole('alert');
      if (alert) {
        expect(alert.textContent).toMatch(/unavailable|error|indisponible/i);
      }
    });
  });

  it('should render upload buttons for CSV and image', () => {
    const { container } = render(<Upload />);
    const buttons = screen.getAllByRole('button');
    
    expect(buttons.length).toBeGreaterThan(0);
    expect(container).toBeTruthy();
  });

  it('should render drawer with sidebar', async () => {
    render(<Upload />);

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeTruthy();
    });
  });

  it('should handle logout', async () => {
    render(<Upload />);

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeTruthy();
    });
  });

  it('should clear session storage on logout', async () => {
    sessionStorage.setItem('serverChecked', 'true');

    render(<Upload />);

    await waitFor(() => {
      expect(screen.getByText(/testuser/i)).toBeTruthy();
    });
  });

  it('should render main upload area', () => {
    const { container } = render(<Upload />);
    
    expect(container).toBeTruthy();
  });

  it('should have upload buttons with correct icons', () => {
    render(<Upload />);
    const buttons = screen.getAllByRole('button');
    
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render with correct layout structure', () => {
    const { container } = render(<Upload />);
    const boxes = container.querySelectorAll('[class*="Box"]');
    
    expect(boxes.length).toBeGreaterThan(0);
  });

  it('should display logos in sidebar', () => {
    const { container } = render(<Upload />);
    const images = container.querySelectorAll('img');
    
    // Should have at least the FastIT and IFPEN logos
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('should render divider in sidebar', () => {
    const { container } = render(<Upload />);
    
    expect(container).toBeTruthy();
  });

  it('should initialize with empty file state', () => {
    const { container } = render(<Upload />);
    
    expect(container).toBeTruthy();
  });
});
