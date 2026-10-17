import { SetMetadata } from '@nestjs/common';

export const SKIP_HISTORY = 'template:skipHistory';

/**
 * Tira uma rota do histórico do sistema.
 *
 * Só para o que muda dado o tempo todo sem ser ação de alguém — como cada mensagem que o bot
 * do WhatsApp repassa. O que a rota fizer de importante é gravado pelo próprio service.
 */
export const SkipHistory = () => SetMetadata(SKIP_HISTORY, true);
