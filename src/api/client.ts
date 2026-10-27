import axios from 'axios'

// Module-level token store — set by AuthenticatedClientProvider
let _token: string | null = null

export function setAuthToken(token: string | null) {
  _token = token
}

const client = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : 'https://proprjet-back-dev.ifpen.fr/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
})

client.interceptors.request.use(config => {
  if (!config.headers) config.headers = new axios.AxiosHeaders()
  if (_token) config.headers.set('Authorization', `Bearer ${_token.replace(/"/g, '')}`)
  return config
})

client.interceptors.response.use(
  res => res,
  err => {
    const message =
      err.response?.data?.message ??
      err.response?.data?.errors?.[0] ??
      'An unexpected error occurred'
    console.error(`[API ${err.response?.status ?? 'ERR'}]`, message)
    return Promise.reject(err)
  }
)

export default client