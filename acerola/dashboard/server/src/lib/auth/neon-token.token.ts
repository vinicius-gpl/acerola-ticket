/**
 * Token de injeção do verificador de token do Neon Auth.
 *
 * Fica num arquivo só dele pelo mesmo motivo do `DB`: quem monta o verificador vai buscar as
 * chaves públicas da Neon pela internet. Se o token de injeção morasse junto da fábrica,
 * qualquer teste que apenas o importasse acabaria abrindo essa conexão.
 */
export const NEON_TOKEN_VERIFIER = 'TEMPLATE_NEON_TOKEN_VERIFIER';
