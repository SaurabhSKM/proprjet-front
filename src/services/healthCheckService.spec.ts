import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthCheckService } from './healthCheckService';
import type { HttpClient } from './healthCheckService';

describe('HealthCheckService', () => {
  let httpMock: HttpClient;

  beforeEach(() => {
    window.__ENV__ = {
      API_URL: 'https://mon-backend.com/api',
      FRAMEWORK_VERSION: 'test',
      TITLE_PAGE: 'test',
      PROJECT_NAME: 'test',
    };

    httpMock = {
      get: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call GET with correct URL (remove /api suffix)', async () => {
    const mockResponse = { status: 'ok' };
    (httpMock.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockResponse,
    });

    const service = new HealthCheckService(httpMock);
    const expectedUrl = window.__ENV__.API_URL.replace('/api', '/');
    const result = await service.checkServer();

    expect(httpMock.get).toHaveBeenCalledWith(expectedUrl);
    expect(result).toEqual(mockResponse);
  });

  it('should throw error if API_URL is not defined', async () => {
    window.__ENV__.API_URL = '';
    const service = new HealthCheckService(httpMock);

    await expect(service.checkServer()).rejects.toThrow('API_URL is not defined in runtime environment');
  });

  it('should propagate http client errors', async () => {
    const error = new Error('Network error');
    (httpMock.get as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

    const service = new HealthCheckService(httpMock);
    await expect(service.checkServer()).rejects.toThrow('Network error');
  });

  it('should handle different API_URL formats', async () => {
    const mockResponse = { status: 'ok' };
    (httpMock.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockResponse,
    });

    window.__ENV__.API_URL = 'http://localhost:3000';
    const service = new HealthCheckService(httpMock);
    await service.checkServer();

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:3000');
  });
});
