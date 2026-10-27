import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useAuth } from './app/auth/services/useAuth';

vi.mock('./app/auth/services/useAuth');

// Stable mocks for all page/layout components so routing doesn't fail
vi.mock('@/components/layout/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));
vi.mock('@/components/ui/LoadingScreen', () => ({
  default: () => <div>Loading</div>,
}));
vi.mock('./app/auth/pages/login-page/LoginPage', () => ({
  default: () => <div>Login Page</div>,
}));
vi.mock('@/pages/substances/SubstancesPage',     () => ({ default: () => <div>Substances</div> }));
vi.mock('@/pages/substances/SubstanceDetail',    () => ({ default: () => <div>Detail</div> }));
vi.mock('@/pages/substances/AnalysisDetailPage', () => ({ default: () => <div>Analysis</div> }));
vi.mock('@/pages/classifications/ClassificationsPage', () => ({ default: () => <div>Classifications</div> }));
vi.mock('@/pages/models/ModelsPage',             () => ({ default: () => <div>Models</div> }));
vi.mock('@/pages/admin/AdminPage',               () => ({ default: () => <div>Admin</div> }));
vi.mock('@/pages/optimizer/OptimizerPage',       () => ({ default: () => <div>Optimizer</div> }));
vi.mock('./api/client', () => ({
  default: {},
  setAuthToken: vi.fn(),
}));

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render LoadingScreen while auth is initializing', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      initializing: true, authenticated: false, token: undefined,
    });

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.queryByText('Login Page')).toBeFalsy();
  });

  it('should render LoginPage when not authenticated', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      initializing: false, authenticated: false, token: undefined,
    });

    render(<MemoryRouter><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeTruthy();
    });
  });

  it('should render Layout (not LoginPage) when authenticated', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      initializing: false, authenticated: true, token: 'tok', username: 'testuser',
    });

    render(<MemoryRouter initialEntries={['/substances']}><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByText('Login Page')).toBeFalsy();
      expect(screen.getByTestId('layout')).toBeTruthy();
    });
  });

  it('should show LoginPage during auth initialization', () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      initializing: true, authenticated: false, token: undefined,
    });

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(screen.queryByText('Login Page')).toBeFalsy();
    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('should not render Layout when authentication fails', async () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      initializing: false, authenticated: false, token: undefined,
    });

    render(<MemoryRouter><App /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByTestId('layout')).toBeFalsy();
      expect(screen.getByText('Login Page')).toBeTruthy();
    });
  });
});
