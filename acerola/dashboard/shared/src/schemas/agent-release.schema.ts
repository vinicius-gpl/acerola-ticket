import { z } from 'zod';

/** O bucket guarda chaves; só a API autenticada transforma essas chaves em URLs temporárias. */
export const agentVersionSchema = z.string().regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
const artifactSchema = z
  .object({
    key: z.string().regex(/^agent\/releases\/\d+\.\d+\.\d+\/[a-zA-Z0-9._-]+$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(512 * 1024 * 1024),
  })
  .strict();

export const agentReleaseManifestSchema = z
  .object({
    version: agentVersionSchema,
    publishedAt: z.string().datetime(),
    artifacts: z.object({ msi: artifactSchema, certificate: artifactSchema }).strict(),
  })
  .strict()
  .superRefine((manifest, context) => {
    const prefix = `agent/releases/${manifest.version}/`;
    for (const [name, artifact] of Object.entries(manifest.artifacts)) {
      const extension = name === 'msi' ? '.msi' : '.cer';
      if (!artifact.key.startsWith(prefix) || !artifact.key.endsWith(extension)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Artefato não corresponde à versão ou ao formato',
          path: ['artifacts', name, 'key'],
        });
      }
    }
  });

export const agentReleaseDownloadSchema = z.object({
  version: agentVersionSchema,
  url: z.string().url(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().positive(),
});
export type AgentReleaseManifest = z.infer<typeof agentReleaseManifestSchema>;
export type AgentReleaseDownload = z.infer<typeof agentReleaseDownloadSchema>;

export const agentDownloadKindSchema = z.enum(['msi', 'certificate', 'certificateScript']);
export type AgentDownloadKind = z.infer<typeof agentDownloadKindSchema>;
export const agentDownloadQuerySchema = z.object({ version: agentVersionSchema });
export const agentLtsSchema = z.object({
  version: agentVersionSchema,
  publishedAt: z.string().datetime(),
  sizeBytes: z.number().int().positive(),
});
export type AgentLts = z.infer<typeof agentLtsSchema>;
export const agentFileLinkSchema = z.object({ version: agentVersionSchema, url: z.string().url() });
export type AgentFileLink = z.infer<typeof agentFileLinkSchema>;

/**
 * Uma versão publicada do agente, na lista de instaladores. Toda versão que a release enviou ao
 * R2 aparece aqui, e não só a LTS: quem precisa voltar uma máquina para a anterior acha o
 * instalador dela.
 */
export const agentReleaseItemSchema = agentLtsSchema.extend({ isLts: z.boolean() });
export type AgentReleaseItem = z.infer<typeof agentReleaseItemSchema>;
