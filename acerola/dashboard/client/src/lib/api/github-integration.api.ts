import {
  type GithubAuthorization,
  type GithubConnection,
} from '@template/shared/schemas/github-connection.schema';
import { apiRequest } from './http-client';

export const githubIntegrationApi = {
  status: () => apiRequest<GithubConnection>('/integrations/github/status'),
  authorize: () =>
    apiRequest<GithubAuthorization>('/integrations/github/authorize', {
      method: 'POST',
      credentials: 'include',
    }),
};
