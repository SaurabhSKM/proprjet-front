export {};

declare global {
  interface Window {
    __ENV__: {
      API_URL: string;
      FRAMEWORK_VERSION: string;
      TITLE_PAGE: string;
      PROJECT_NAME: string;
    };
  }
}