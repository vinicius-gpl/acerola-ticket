#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

const SERVER_ENV_PATH = resolve(process.cwd(), 'server', '.env');
const ROOT_ENV_PATH = resolve(process.cwd(), '.env');

const envPath = existsSync(SERVER_ENV_PATH) ? SERVER_ENV_PATH : ROOT_ENV_PATH;

if (!existsSync(envPath)) {
  console.error(`❌ Arquivo de ambiente não encontrado em: ${envPath}`);
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf-8');
const match = envContent.match(/^DATABASE_URL=(.+)$/m);

if (!match || !match[1]) {
  console.error('❌ Variável DATABASE_URL não encontrada no arquivo .env');
  process.exit(1);
}

const dbUrl = match[1].trim().replace(/^['"]|['"]$/g, '');

const sql = postgres(dbUrl, {
  ssl: dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') ? false : 'require',
  max: 1,
});

async function main() {
  const args = process.argv.slice(2);
  let targetEmail = args[0];
  const targetRole = args[1] || 'admin';
  const targetContext = args[2] || 'sistema';

  console.log('🔍 Conectando ao banco de dados...');

  try {
    const users = await sql`
      SELECT id, email, name, role FROM neon_auth.user
    `;

    if (users.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado na tabela neon_auth.user.');
      return;
    }

    let userToPromote = null;

    if (targetEmail) {
      userToPromote = users.find(
        (u) => u.email.toLowerCase() === targetEmail.toLowerCase() || u.id === targetEmail
      );
      if (!userToPromote) {
        console.error(`❌ Usuário com e-mail/ID "${targetEmail}" não encontrado.`);
        console.log('\nUsuários disponíveis:');
        users.forEach((u) => console.log(`  - ${u.name} (${u.email}) [role: ${u.role}]`));
        process.exit(1);
      }
    } else {
      // Se não passou e-mail e só tem 1 usuário, promove ele automaticamente
      if (users.length === 1) {
        userToPromote = users[0];
        console.log(`ℹ️ Nenhum e-mail informado. Selecionando o único usuário encontrado: ${userToPromote.email}`);
      } else {
        console.log('ℹ️ Múltiplos usuários encontrados. Selecionando o primeiro ou informe o e-mail:');
        users.forEach((u, i) => console.log(`  ${i + 1}. ${u.name} (${u.email}) [role: ${u.role}]`));
        userToPromote = users[0];
        console.log(`\nPromovendo: ${userToPromote.email}`);
      }
    }

    console.log(`\n🚀 Promovendo ${userToPromote.name} (${userToPromote.email}) para "${targetRole}"...`);

    // 1. Atualiza na autenticação legada (neon_auth.user)
    await sql`
      UPDATE neon_auth.user
      SET role = ${targetRole}
      WHERE id = ${userToPromote.id}
    `;

    // 2. Atualiza ou insere na nova tabela de cargos desacoplados (internal_roles)
    await sql`
      INSERT INTO internal_roles (user_id, user_email, context, role, created_at, created_by)
      VALUES (${userToPromote.id}, ${userToPromote.email}, ${targetContext}, ${targetRole}, NOW(), 'dev-promote-script')
      ON CONFLICT (user_id, context)
      DO UPDATE SET
        role = ${targetRole},
        user_email = ${userToPromote.email},
        updated_at = NOW(),
        updated_by = 'dev-promote-script'
    `;

    console.log(`✅ Sucesso!`);
    console.log(`   - Usuário: ${userToPromote.name} (${userToPromote.email})`);
    console.log(`   - Cargo no Contexto "${targetContext}": ${targetRole}`);
    console.log(`   - Cargo na Autenticação (neon_auth): ${targetRole}`);
    console.log('\n💡 Se você já estiver logado no navegador, recarregue a página (F5) ou refaça o login para renovar a sessão.');
  } catch (err) {
    console.error('❌ Erro ao atualizar cargo no banco:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
