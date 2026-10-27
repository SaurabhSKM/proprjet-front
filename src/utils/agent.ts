import type { AxiosResponse } from "axios";
import { useAxios } from "../services/useAxios";

/**
 * Paramètres pour les requêtes GET / DELETE
 * @template T Type des paramètres de l’URL
 */
export interface RequestParams<T = Record<string, unknown>> {
  url: string;
  params?: T;
  headers?: Record<string, string>;
}

/**
 * Paramètres pour les requêtes POST / PUT / PATCH
 * @template T Type des données envoyées dans le body
 */
export interface DataParams<T = unknown> {
  url: string;
  data?: T;
  headers?: Record<string, string>;
}

/**
 * Hook pour exposer les méthodes HTTP type-safe
 */
export const useAgent = () => {
  const axiosInstance = useAxios();

  const get = <T = unknown>({ url, params, headers }: RequestParams): Promise<AxiosResponse<T>> =>
    axiosInstance.get<T>(url, { params, headers });

  const post = <T = unknown, R = unknown>({ url, data, headers }: DataParams<T>): Promise<AxiosResponse<R>> =>
    axiosInstance.post<R>(url, data, { headers });

  const put = <T = unknown, R = unknown>({ url, data, headers }: DataParams<T>): Promise<AxiosResponse<R>> =>
    axiosInstance.put<R>(url, data, { headers });

  const patch = <T = unknown, R = unknown>({ url, data, headers }: DataParams<T>): Promise<AxiosResponse<R>> =>
    axiosInstance.patch<R>(url, data, { headers });

  const del = <T = unknown>({ url, params, headers }: RequestParams): Promise<AxiosResponse<T>> =>
    axiosInstance.delete<T>(url, { params, headers });

  return { get, post, put, patch, delete: del };
};
