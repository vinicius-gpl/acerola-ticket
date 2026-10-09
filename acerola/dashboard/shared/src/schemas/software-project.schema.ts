import { z } from 'zod';

import {
  SOFTWARE_PROJECT_COLORS,
  SOFTWARE_PROJECT_STATUSES,
} from '../domain/software-project.util';
import { paginationQuerySchema } from './pagination.schema';

export const SOFTWARE_PROJECT_NAME_MAX_LENGTH = 120;
export const SOFTWARE_PROJECT_DESCRIPTION_MAX_LENGTH = 2000;

export const softwareProjectStatusSchema = z.enum(SOFTWARE_PROJECT_STATUSES, {
  errorMap: () => ({ message: 'Escolha uma situação válida' }),
});

export const softwareProjectColorSchema = z.enum(SOFTWARE_PROJECT_COLORS, {
  errorMap: () => ({ message: 'Escolha uma cor' }),
});

export const softwareProjectSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1).max(SOFTWARE_PROJECT_NAME_MAX_LENGTH),
  description: z.string().nullable(),
  repositoryUrl: z.string().min(1),
  status: softwareProjectStatusSchema,
  color: softwareProjectColorSchema,
  githubRepoOwner: z.string().nullable(),
  githubRepoName: z.string().nullable(),
  openTicketsCount: z.number().int().default(0),
  pullRequestsCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
});

export type SoftwareProject = z.infer<typeof softwareProjectSchema>;

export const createSoftwareProjectSchema = z.object({
  name: z
    .string({ required_error: 'Informe o nome do sistema' })
    .trim()
    .min(1, 'Informe o nome do sistema')
    .max(
      SOFTWARE_PROJECT_NAME_MAX_LENGTH,
      `O nome pode ter até ${SOFTWARE_PROJECT_NAME_MAX_LENGTH} caracteres`,
    ),
  description: z
    .string()
    .trim()
    .max(
      SOFTWARE_PROJECT_DESCRIPTION_MAX_LENGTH,
      `A descrição pode ter até ${SOFTWARE_PROJECT_DESCRIPTION_MAX_LENGTH} caracteres`,
    )
    .optional()
    .nullable(),
  repositoryUrl: z
    .string({ required_error: 'Informe o link ou identificador do repositório no GitHub' })
    .trim()
    .min(1, 'Informe o link do repositório no GitHub'),
  status: softwareProjectStatusSchema.default('active'),
  color: softwareProjectColorSchema.default('blue'),
});

export type CreateSoftwareProjectInput = z.infer<typeof createSoftwareProjectSchema>;

export const updateSoftwareProjectSchema = createSoftwareProjectSchema.partial();
export type UpdateSoftwareProjectInput = z.infer<typeof updateSoftwareProjectSchema>;

export const softwareProjectListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: softwareProjectStatusSchema.optional(),
});

export type SoftwareProjectListQuery = z.infer<typeof softwareProjectListQuerySchema>;

/** Forma do formulário na web. */
export const softwareProjectFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do sistema')
    .max(SOFTWARE_PROJECT_NAME_MAX_LENGTH, `O nome pode ter até ${SOFTWARE_PROJECT_NAME_MAX_LENGTH} caracteres`),
  description: z
    .string()
    .trim()
    .max(SOFTWARE_PROJECT_DESCRIPTION_MAX_LENGTH, `A descrição pode ter até ${SOFTWARE_PROJECT_DESCRIPTION_MAX_LENGTH} caracteres`),
  repositoryUrl: z
    .string()
    .trim()
    .min(1, 'Informe o link do repositório no GitHub'),
  status: softwareProjectStatusSchema,
  color: softwareProjectColorSchema,
});

export type SoftwareProjectForm = z.infer<typeof softwareProjectFormSchema>;
