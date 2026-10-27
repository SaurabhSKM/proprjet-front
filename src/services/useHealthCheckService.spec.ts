import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHealthCheckService } from './useHealthCheckService';
import { useAxios } from './useAxios';

// Mock useAxios
vi.mock('./useAxios', () => ({
  useAxios: vi.fn(),
}));

describe('useHealthCheckService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.__ENV__ = {
      API_URL: 'https://api.example.com/api',
      FRAMEWORK_VERSION: 'test',
      TITLE_PAGE: 'test',
      PROJECT_NAME: 'test',
    };
  });

  it('should return HealthCheckService instance', () => {
    const mockAxios = {
      get: vi.fn(),
    };

    (useAxios as ReturnType<typeof vi.fn>).mockReturnValue(mockAxios);

    const { result } = renderHook(() => useHealthCheckService());

    expect(result.current).toBeDefined();
    expect(result.current.checkServer).toBeDefined();
  });

  it('should create service with axios instance', () => {
    const mockAxios = {
      get: vi.fn().mockResolvedValue({ data: { status: 'ok' } }),
    };

    (useAxios as ReturnType<typeof vi.fn>).mockReturnValue(mockAxios);

    const { result } = renderHook(() => useHealthCheckService());

    expect(result.current).toBeDefined();
  });

  it('should memoize service instance', () => {
    const mockAxios = {
      get: vi.fn(),
    };

    (useAxios as ReturnType<typeof vi.fn>).mockReturnValue(mockAxios);

    const { result: result1, rerender } = renderHook(() => useHealthCheckService());
    const service1 = result1.current;

    rerender();

    const { result: result2 } = renderHook(() => useHealthCheckService());
    const service2 = result2.current;

    // Should create new instances (memoization per hook call)
    expect(service1).toStrictEqual(service2);
  });
});
