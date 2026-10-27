import { useMemo } from 'react';
import { HealthCheckService } from './healthCheckService';
import { useAxios } from './useAxios';

export const useHealthCheckService = (): HealthCheckService => {
  const axios = useAxios();

  return useMemo(() => new HealthCheckService(axios), [axios]);
};
