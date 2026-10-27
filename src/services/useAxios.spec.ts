import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAxios } from './useAxios';
import { useAuth } from '../app/auth/services/useAuth';
import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// Mock useAuth
vi.mock('../app/auth/services/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('useAxios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add Authorization header and remove quotes (Couverture Lignes 15-23)', async () => {
    const mockToken = '"secret-token"';
    (useAuth as any).mockReturnValue({ token: mockToken });

    const { result } = renderHook(() => useAxios());
    const instance = result.current;

    // @ts-ignore - Accès interne pour le test
    const interceptor = instance.interceptors.request.handlers[0].fulfilled;

    const mockConfig = {
      headers: new axios.AxiosHeaders(),
    };
    const resultConfig = interceptor(mockConfig) as InternalAxiosRequestConfig;

    expect(resultConfig.headers.get('Authorization')).toBe('Bearer secret-token');
  });

  it('should create headers if they are undefined (Couverture Ligne 16-18)', async () => {
    (useAuth as any).mockReturnValue({ token: 'token' });
    const { result } = renderHook(() => useAxios());

    // @ts-ignore - Accès interne pour le test
    const interceptor = result.current.interceptors.request.handlers[0].fulfilled;
    const mockConfig = { headers: new axios.AxiosHeaders() };
    const resultConfig = interceptor(mockConfig) as InternalAxiosRequestConfig;

    expect(resultConfig.headers).toBeDefined();
    expect(resultConfig.headers.get('Authorization')).toBe('Bearer token');
  });

  it('should not add Authorization header if token is missing', async () => {
      (useAuth as any).mockReturnValue({ token: undefined });
      const { result } = renderHook(() => useAxios());

      // @ts-ignore - Accès interne pour le test
      const interceptor = result.current.interceptors.request.handlers[0].fulfilled;
      const mockConfig = { headers: new axios.AxiosHeaders() };
      const resultConfig = interceptor(mockConfig) as InternalAxiosRequestConfig;

      expect(resultConfig.headers.get('Authorization')).toBeFalsy();
  });
});