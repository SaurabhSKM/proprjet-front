import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useUpload } from './uploadCsvImg';
import { useAgent } from '../utils/agent';

vi.mock('../utils/agent', () => ({
  useAgent: vi.fn(),
}));

describe('useUpload', () => {
  let mockPost: any;

  beforeEach(() => {
    // Reset complet de l'environnement avant chaque test
    vi.stubGlobal('window', { __ENV__: { API_URL: 'https://api.example.com/api' } });

    mockPost = vi.fn();
    (useAgent as any).mockReturnValue({
      post: mockPost,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Configuration de l\'API_URL (Branches)', () => {
    it('should throw error if API_URL is totally missing', () => {
      vi.stubGlobal('window', { __ENV__: {} });
      // On mock import.meta.env à vide pour forcer l'erreur
      vi.stubGlobal('import.meta', { env: {} });

      expect(() => useUpload()).toThrow('API_URL not defined');
    });

    it('should use VITE_API_URL if window.__ENV__ is missing', () => {
          // 1. On vide window.__ENV__
          vi.stubGlobal('window', { __ENV__: {} });

          // 2. On injecte la variable d'env via Vitest
          vi.stubEnv('VITE_API_URL', 'https://vite-api.com');

          // 3. On appelle useUpload
          const upload = useUpload();

          expect(upload).toBeDefined();

          // Pour le nettoyage, si unstubEnv() n'est pas reconnu,
          // on utilise vi.unstubAllEnvs() ou on laisse faire le clearAllMocks
          if (vi.unstubAllEnvs) {
            vi.unstubAllEnvs();
          }
        });
  });

  describe('uploadCsv (Gestion des erreurs et lignes 53+)', () => {
    const mockFile = new File(['csv'], 'test.csv', { type: 'text/csv' });

    it('should handle stats failure and continue to table (Couverture Ligne 53)', async () => {
      const mockError = new Error('Stats Failed');
      const mockSuccess = { data: { ok: true } };

      // Scénario : La première échoue, la deuxième réussit
      mockPost
        .mockRejectedValueOnce(mockError)   // stats catch
        .mockResolvedValueOnce(mockSuccess); // table success

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { response, response2 } = await useUpload().uploadCsv(mockFile);

      expect(response).toBeUndefined();     // Échec stats
      expect(response2).toEqual(mockSuccess); // Succès table
      expect(consoleSpy).toHaveBeenCalledWith("Erreur upload pour stats", mockError);
      consoleSpy.mockRestore();
    });

    it('should handle both failures', async () => {
      mockPost.mockRejectedValue(new Error('Fatal error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { response, response2 } = await useUpload().uploadCsv(mockFile);

      expect(response).toBeUndefined();
      expect(response2).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      consoleSpy.mockRestore();
    });

    it('should handle table failure and log error (Couverture Ligne 48)', async () => {
          const mockFile = new File(['csv'], 'test.csv', { type: 'text/csv' });
          const mockSuccess = { data: { ok: true } };
          const mockError = new Error('Table Upload Failed');

          // 1. Premier appel (stats) réussit, Deuxième appel (table) échoue
          mockPost
            .mockResolvedValueOnce(mockSuccess)
            .mockRejectedValueOnce(mockError);

          // 2. On espionne la console pour vérifier le log et couvrir la ligne
          const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

          const { response, response2 } = await useUpload().uploadCsv(mockFile);

          // 3. Vérifications
          expect(response).toEqual(mockSuccess); // Stats OK
          expect(response2).toBeUndefined();     // Table KO
          expect(consoleSpy).toHaveBeenCalledWith("Erreur upload pour table", mockError);

          consoleSpy.mockRestore();
        });
  });

  describe('uploadImage', () => {
    it('should upload image correctly', async () => {
      const mockFile = new File(['img'], 'test.jpg', { type: 'image/jpeg' });
      mockPost.mockResolvedValue({ data: 'ok' });

      const res = await useUpload().uploadImage(mockFile);

      expect(res.data).toBe('ok');
      expect(mockPost).toHaveBeenCalledWith(expect.objectContaining({
        headers: { "Content-Type": "multipart/form-data" }
      }));
    });
  });
});