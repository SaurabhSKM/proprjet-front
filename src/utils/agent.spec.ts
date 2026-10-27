import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAgent } from './agent';
import { useAxios } from '../services/useAxios';

// Mock useAxios
vi.mock('../services/useAxios', () => ({
  useAxios: vi.fn(),
}));

interface MockAxiosInstance {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
}

describe('useAgent', () => {
  let mockAxios: MockAxiosInstance;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAxios = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    (useAxios as ReturnType<typeof vi.fn>).mockReturnValue(mockAxios);
  });

  it('should return agent methods', () => {
    const { result } = renderHook(() => useAgent());

    expect(result.current).toHaveProperty('get');
    expect(result.current).toHaveProperty('post');
    expect(result.current).toHaveProperty('put');
    expect(result.current).toHaveProperty('patch');
    expect(result.current).toHaveProperty('delete');
  });

  it('should call axios.get with correct parameters', async () => {
    const mockResponse = { status: 200, data: { id: 1 } };
    mockAxios.get.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgent());
    const response = await result.current.get({
      url: 'https://api.example.com/users',
      params: { page: 1 },
    });

    expect(mockAxios.get).toHaveBeenCalledWith(
      'https://api.example.com/users',
      { params: { page: 1 }, headers: undefined }
    );
    expect(response).toEqual(mockResponse);
  });

  it('should call axios.post with correct parameters', async () => {
    const mockResponse = { status: 201, data: { id: 1, name: 'test' } };
    mockAxios.post.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgent());
    const response = await result.current.post({
      url: 'https://api.example.com/users',
      data: { name: 'test' },
    });

    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://api.example.com/users',
      { name: 'test' },
      { headers: undefined }
    );
    expect(response).toEqual(mockResponse);
  });

  it('should call axios.put with correct parameters', async () => {
    const mockResponse = { status: 200, data: { id: 1, name: 'updated' } };
    mockAxios.put.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgent());
    const response = await result.current.put({
      url: 'https://api.example.com/users/1',
      data: { name: 'updated' },
    });

    expect(mockAxios.put).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      { name: 'updated' },
      { headers: undefined }
    );
    expect(response).toEqual(mockResponse);
  });

  it('should call axios.patch with correct parameters', async () => {
    const mockResponse = { status: 200, data: { id: 1, name: 'patched' } };
    mockAxios.patch.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgent());
    const response = await result.current.patch({
      url: 'https://api.example.com/users/1',
      data: { name: 'patched' },
    });

    expect(mockAxios.patch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      { name: 'patched' },
      { headers: undefined }
    );
    expect(response).toEqual(mockResponse);
  });

  it('should call axios.delete with correct parameters', async () => {
    const mockResponse = { status: 204, data: null };
    mockAxios.delete.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgent());
    const response = await result.current.delete({
      url: 'https://api.example.com/users/1',
    });

    expect(mockAxios.delete).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      { params: undefined, headers: undefined }
    );
    expect(response).toEqual(mockResponse);
  });

  it('should pass custom headers through', async () => {
    const mockResponse = { status: 200, data: {} };
    mockAxios.get.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAgent());
    await result.current.get({
      url: 'https://api.example.com/data',
      headers: { 'X-Custom': 'value' },
    });

    expect(mockAxios.get).toHaveBeenCalledWith(
      'https://api.example.com/data',
      { params: undefined, headers: { 'X-Custom': 'value' } }
    );
  });
});
