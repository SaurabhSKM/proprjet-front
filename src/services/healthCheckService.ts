export interface HttpClient {
  get<T = unknown>(url: string): Promise<{ data: T }>;
}

export class HealthCheckService {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  async checkServer<T = unknown>() {
    const apiUrl = window.__ENV__.API_URL;

    if (!apiUrl) {
      throw new Error('API_URL is not defined in runtime environment');
    }

    const baseUrl = apiUrl.replace('/api', '/');
    console.log(`HealthCheckService: Checking server at ${baseUrl}`);
    const response = await this.http.get<T>(baseUrl);
    return response.data;
  }
}
