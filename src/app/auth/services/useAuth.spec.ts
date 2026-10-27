import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';
import { AuthContext, type AuthContextType } from './AuthContext';
import React from 'react';

function makeContext(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    keycloak: {} as AuthContextType['keycloak'],
    initializing: false,
    authenticated: true,
    token: 'test-token',
    username: 'testuser',
    roles: [],
    isAdmin: true,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides,
  }
}

function makeWrapper(ctx: AuthContextType) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthContext.Provider, { value: ctx }, children)
}

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
  });

  it('returns username, token, authenticated from context', () => {
    const ctx = makeContext({ username: 'saurabh', token: 'tok123', authenticated: true })
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) })

    expect(result.current.username).toBe('saurabh')
    expect(result.current.token).toBe('tok123')
    expect(result.current.authenticated).toBe(true)
  })

  it('exposes roles array', () => {
    const ctx = makeContext({ roles: ['app-admin', 'offline_access'] })
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) })
    expect(result.current.roles).toEqual(['app-admin', 'offline_access'])
  })

  it('isAdmin is true when roles includes app-admin', () => {
    const ctx = makeContext({ roles: ['app-admin'], isAdmin: true })
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) })
    expect(result.current.isAdmin).toBe(true)
  })

  it('isAdmin is false when roles has values but not app-admin', () => {
    const ctx = makeContext({ roles: ['app-user', 'offline_access'], isAdmin: false })
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) })
    expect(result.current.isAdmin).toBe(false)
  })

  it('isAdmin is true when roles is empty (dev fallback)', () => {
    const ctx = makeContext({ roles: [], isAdmin: true })
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) })
    expect(result.current.isAdmin).toBe(true)
  })

  it('login and logout are callable functions', () => {
    const login = vi.fn()
    const logout = vi.fn()
    const ctx = makeContext({ login, logout })
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) })

    expect(typeof result.current.login).toBe('function')
    expect(typeof result.current.logout).toBe('function')
    result.current.login()
    result.current.logout()
    expect(login).toHaveBeenCalledOnce()
    expect(logout).toHaveBeenCalledOnce()
  })

  it('exposes initializing flag', () => {
    const ctx = makeContext({ initializing: true, authenticated: false })
    const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(ctx) })
    expect(result.current.initializing).toBe(true)
  })
})
