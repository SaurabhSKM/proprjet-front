import type { AxiosResponse } from "axios";
import { useAgent } from "../utils/agent";

/**
 * Hook pour uploader CSV / images via useAgent
 */
export const useUpload = () => {
    const { post } = useAgent();

    // On simplifie la récupération pour qu'elle soit lisible par les outils de test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtimeEnv = (window as any).__ENV__;

    // Utilisation standard de import.meta.env (Vite le gère très bien)
    const API_URL = runtimeEnv?.API_URL || import.meta.env.VITE_API_URL || import.meta.env.API_URL;

    if (!API_URL) {
      throw new Error("API_URL not defined. Provide runtime window.__ENV__.API_URL (prod) or VITE_API_URL in local .env");
    }

  const uploadCsvStats = (file: File): Promise<AxiosResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return post({
      url: `${API_URL}/upload-files/stats`,
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const uploadCsvTable = (file: File): Promise<AxiosResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return post({
      url: `${API_URL}/upload-files/table`,
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const uploadCsv = async (
    file: File
  ): Promise<{ response?: AxiosResponse; response2?: AxiosResponse }> => {
    let response: AxiosResponse | undefined;
    let response2: AxiosResponse | undefined;

    try {
      response = await uploadCsvStats(file);
      console.log("Upload réussi pour stats");
    } catch (error) {
      console.error("Erreur upload pour stats", error);
    }

    try {
      response2 = await uploadCsvTable(file);
      console.log("Upload réussi pour table");
    } catch (error) {
      console.error("Erreur upload pour table", error);
    }

    return { response, response2 };
  };

  const uploadImage = (file: File): Promise<AxiosResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return post({
      url: `${API_URL}/upload-files/image`,
      data: formData,
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  return { uploadCsv, uploadImage };
};
