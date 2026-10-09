import { z } from 'zod';

export const githubConnectionSchema = z.object({
  isConfigured: z.boolean(),
  isLinked: z.boolean(),
  login: z.string().nullable(),
});
export type GithubConnection = z.infer<typeof githubConnectionSchema>;

export const githubAuthorizationSchema = z.object({ url: z.string().url() });
export type GithubAuthorization = z.infer<typeof githubAuthorizationSchema>;
