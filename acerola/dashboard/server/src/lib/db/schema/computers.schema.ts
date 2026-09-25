import { HEALTH_STATUSES } from '@template/shared/domain/computer-health.util';
import { DEPARTMENTS } from '@template/shared/domain/department.util';
import { DISPOSAL_TYPES } from '@template/shared/domain/disposal.util';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Os computadores da empresa.
 *
 * O cadastro nasce no dashboard, com um nome, e gera um token. Só depois o agente é instalado
 * na máquina com esse token. A ordem é essa de propósito: se a máquina pudesse se cadastrar
 * sozinha ao conectar, qualquer computador que descobrisse o endereço do servidor entraria no
 * inventário — e o bloqueio de coletor do sistema antigo existia exatamente porque isso
 * acontecia.
 *
 * **`online` não é coluna.** Uma máquina está online se existe uma conexão WebSocket dela
 * aberta agora. Como campo salvo, uma queda de energia deixaria a máquina presa em "online"
 * para sempre, porque ninguém ficou vivo para escrever "offline".
 *
 * **Nada aqui se apaga.** Máquina que saiu de uso é arquivada: some das listas e continua no
 * banco, com o histórico inteiro — que é o que sustenta "esta máquina deu problema demais,
 * vamos trocar" na hora de decidir compra.
 */
export const computers = pgTable(
  'computers',
  {
    id: serial('id').primaryKey(),

    /* O nome que a própria máquina informa. Único: é a chave pela qual o agente se encontra. */
    name: text('name').notNull().unique(),
    displayName: text('display_name'),
    responsibleName: text('responsible_name'),
    department: text('department', { enum: DEPARTMENTS }),

    /**
     * O HASH do token, nunca o token. Mesmo princípio de senha: um vazamento do banco não
     * pode entregar a credencial que faz uma máquina falsa se passar por uma de verdade.
     *
     * É ÚNICO porque é por ele que o agente se identifica — ele não manda o nome da máquina.
     * Fosse pelo nome, o hostname real e o nome digitado no cadastro poderiam divergir (alguém
     * renomeia a máquina no Windows) e a telemetria pararia de achar a ficha. O token não tem
     * esse problema: ele é a identidade, e o hostname vira apenas mais um dado medido.
     */
    tokenHash: text('token_hash').notNull().unique(),

    /* Os fatos de hardware, do último envio. Nulos até a primeira conexão: nulo diz "ainda
       não sei", zero diria "medi e deu zero", que é outra coisa. */
    os: text('os'),
    platform: text('platform'),
    platformVersion: text('platform_version'),
    kernelVersion: text('kernel_version'),
    arch: text('arch'),
    cpuModel: text('cpu_model'),
    logicalCpus: integer('logical_cpus'),
    physicalCpus: integer('physical_cpus'),
    /* `bigint` e não `integer`: 16 GB em bytes passa de 17 bilhões, e `int4` para em 2,1. */
    totalMemoryBytes: bigint('total_memory_bytes', { mode: 'number' }),
    macAddress: text('mac_address'),
    localIp: text('local_ip'),
    totalDiskBytes: bigint('total_disk_bytes', { mode: 'number' }),
    freeDiskBytes: bigint('free_disk_bytes', { mode: 'number' }),
    uptimeSeconds: bigint('uptime_seconds', { mode: 'number' }),
    bootTime: timestamp('boot_time', { withTimezone: true, mode: 'date' }),

    /**
     * A leitura completa MAIS RECENTE — processos, volumes, interfaces de rede.
     *
     * Só a última, e não uma por envio: a tela de detalhe quer saber o que está acontecendo
     * agora, e guardar o histórico completo de processos de cada máquina a cada 30 segundos
     * encheria o banco com dados que ninguém consulta.
     */
    lastSnapshot: jsonb('last_snapshot'),

    healthScore: integer('health_score').notNull().default(100),
    healthStatus: text('health_status', { enum: HEALTH_STATUSES }).notNull().default('good'),
    warnings: jsonb('warnings').notNull().default(sql`'[]'::jsonb`),

    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }),
    agentVersion: text('agent_version'),

    isArchived: boolean('is_archived').notNull().default(false),
    /* Bloqueada tem a conexão recusada mesmo com token válido — é como se tira do ar uma
       máquina que não devia estar enviando, sem precisar caçar o token dela. */
    isBlocked: boolean('is_blocked').notNull().default(false),
    blockReason: text('block_reason'),

    /**
     * O DESCARTE: a máquina que saiu de uso de vez.
     *
     * `disposed_at` nulo é o que diz "em uso" — não há booleano à parte, porque dois campos
     * dizendo a mesma coisa acabam discordando no primeiro caminho de escrita esquecido.
     *
     * A data é carimbada pelo servidor, e não digitada: uma saída lançada "de ontem" seria um
     * jeito silencioso de ajustar o passado.
     */
    disposedAt: timestamp('disposed_at', { withTimezone: true, mode: 'date' }),
    disposalType: text('disposal_type', { enum: DISPOSAL_TYPES }),
    disposalReason: text('disposal_reason'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('computers_department_idx').on(table.department),
    index('computers_health_status_idx').on(table.healthStatus),
    index('computers_last_seen_idx').on(table.lastSeenAt),
    /* O agente chega dizendo só o nome: esta busca acontece em toda conexão. */
    index('computers_name_idx').on(table.name),
    /* "O que saiu de uso" é a consulta da tela de Descarte, e ela filtra por esta coluna. */
    index('computers_disposed_idx').on(table.disposedAt),
    check(
      'computers_health_status_valid',
      sql`${table.healthStatus} in (${valuesFor(HEALTH_STATUSES)})`,
    ),
    check(
      'computers_department_valid',
      sql`${table.department} is null or ${table.department} in (${valuesFor(DEPARTMENTS)})`,
    ),
    check(
      'computers_health_score_range',
      sql`${table.healthScore} between 0 and 100`,
    ),
    /* Máquina descartada sem tipo e sem motivo é uma saída que não explica nada — e o mapa
       de "o que saiu de uso e por quê" é justamente para isso que existe. */
    check(
      'computers_disposal_complete',
      sql`(${table.disposedAt} is null and ${table.disposalType} is null and ${table.disposalReason} is null)
        or (${table.disposedAt} is not null and ${table.disposalType} is not null and ${table.disposalReason} is not null)`,
    ),
    check(
      'computers_disposal_type_valid',
      sql`${table.disposalType} is null or ${table.disposalType} in (${valuesFor(DISPOSAL_TYPES)})`,
    ),
  ],
);

export type ComputerRow = typeof computers.$inferSelect;
export type ComputerInsert = typeof computers.$inferInsert;
