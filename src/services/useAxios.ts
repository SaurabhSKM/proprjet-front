import { useMemo } from "react";
import axios, { type AxiosInstance } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { useAuth } from "../app/auth/services/useAuth";

export const useAxios = (): AxiosInstance => {
  const { token } = useAuth();

  const instance = useMemo(() => {
    const axiosInstance = axios.create();

    axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
        // Si headers est undefined, crée un AxiosHeaders vide
        if (!config.headers) {
          config.headers = new axios.AxiosHeaders();
        }

        if (token) {
          config.headers.set('Authorization', `Bearer ${token.replace(/"/g, '')}`);
        }

        return config;
      }
    );

    return axiosInstance;
  }, [token]);

  return instance;
};
