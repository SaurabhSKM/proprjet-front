import { useEffect } from 'react'
import { useAuth } from '@/app/auth/services/useAuth'
import { setAuthToken } from './client'

/**
 * Renders nothing — just keeps the singleton Axios client's token
 * in sync with the Keycloak session. Place this inside AuthProvider
 * but outside any page components.
 */
export default function AuthenticatedClientProvider() {
  const { token } = useAuth()

  useEffect(() => {
    setAuthToken(token ?? null)
  }, [token])

  return null
}