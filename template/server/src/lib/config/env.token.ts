/**
 * Token de injeção do ambiente já validado.
 *
 * Fica num arquivo só dele porque o módulo de configuração valida o ambiente no momento
 * em que é avaliado: se o token morasse lá, qualquer arquivo que apenas o importasse —
 * um service, um guard, o teste de um deles — derrubaria a importação por falta de
 * variável de ambiente que aquele teste nem usa.
 */
export const ENV = 'TEMPLATE_ENV';
