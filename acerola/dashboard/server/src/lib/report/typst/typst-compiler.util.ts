import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

export type CompileTypstOptions = {
  /**
   * Caminho relativo à pasta raiz do Typst (ex: 'documents/service-order.typ')
   * ou caminho absoluto no sistema de arquivos.
   */
  documentPath: string;

  /**
   * Objeto JSON passado para o documento via `sys.inputs.at("data")` ou `data_file`.
   */
  data?: Record<string, unknown>;

  /**
   * Data de criação fixa para garantir determinismo e reprodutibilidade byte a byte.
   * Pode ser um objeto Date ou um timestamp Unix em segundos ou milissegundos.
   */
  creationTimestamp?: Date | number;

  /**
   * Entradas extras em texto passadas via `--input chave=valor`.
   */
  inputs?: Record<string, string>;
};

/**
 * Encontra a raiz do diretório Typst (`template.typ`, `fonts/`, `documents/`).
 * Suporta execução direta (tsx / vitest em `src/`), build compilado (`dist/`),
 * ou diretório de trabalho raiz.
 */
export function resolveTypstRootDir(): string {
  if (existsSync(join(__dirname, 'template.typ'))) {
    return __dirname;
  }

  const srcCandidate = resolve(__dirname, '../../../../src/lib/report/typst');
  if (existsSync(join(srcCandidate, 'template.typ'))) {
    return srcCandidate;
  }

  const cwdCandidate = resolve(process.cwd(), 'src/lib/report/typst');
  if (existsSync(join(cwdCandidate, 'template.typ'))) {
    return cwdCandidate;
  }

  const cwdServerCandidate = resolve(process.cwd(), 'server/src/lib/report/typst');
  if (existsSync(join(cwdServerCandidate, 'template.typ'))) {
    return cwdServerCandidate;
  }

  const repoRootCandidate = resolve(process.cwd(), 'acerola/dashboard/server/src/lib/report/typst');
  if (existsSync(join(repoRootCandidate, 'template.typ'))) {
    return repoRootCandidate;
  }

  return __dirname;
}

function appendTimestampArg(
  timestamp: Date | number | undefined,
  args: string[],
): void {
  if (timestamp === undefined) return;

  const epochSeconds =
    timestamp instanceof Date
      ? Math.floor(timestamp.getTime() / 1000)
      : timestamp > 1e11
        ? Math.floor(timestamp / 1000)
        : Math.floor(timestamp);

  args.push('--creation-timestamp', epochSeconds.toString());
}

function prepareDataInput(
  typstRoot: string,
  data: Record<string, unknown> | undefined,
  args: string[],
): string | null {
  if (data === undefined) return null;

  const jsonString = JSON.stringify(data);
  const tmpDir = join(typstRoot, '.tmp');

  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  const tempFileName = `${randomUUID()}.json`;
  const tempJsonPath = join(tmpDir, tempFileName);
  writeFileSync(tempJsonPath, jsonString, 'utf-8');

  args.push('--input', `data_file=/.tmp/${tempFileName}`);

  if (jsonString.length < 2000) {
    args.push('--input', `data=${jsonString}`);
  }

  return tempJsonPath;
}

function appendExtraInputs(
  inputs: Record<string, string> | undefined,
  args: string[],
): void {
  if (!inputs) return;

  for (const [key, value] of Object.entries(inputs)) {
    args.push('--input', `${key}=${value}`);
  }
}

function cleanupTempFile(filePath: string | null): void {
  if (!filePath || !existsSync(filePath)) return;

  try {
    unlinkSync(filePath);
  } catch {
    // Silencioso em caso de remoção concorrente
  }
}

function spawnTypstProcess(args: string[]): Promise<Buffer> {
  return new Promise((resolveBuffer, reject) => {
    const child = spawn('typst', args, {
      windowsHide: true,
    });

    const chunks: Buffer[] = [];
    const errorChunks: string[] = [];

    child.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      errorChunks.push(chunk.toString());
    });

    child.on('error', (err) => {
      reject(new Error(`Falha ao invocar o compilador Typst: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        const errorMsg = errorChunks.join('').trim();
        reject(
          new Error(
            `Erro na compilação do Typst (código ${code}): ${errorMsg || 'desconhecido'}`,
          ),
        );
        return;
      }

      resolveBuffer(Buffer.concat(chunks));
    });
  });
}

/**
 * Compila um documento Typst para PDF diretamente na memória (Buffer via stdout).
 *
 * Utiliza o binário nativo `typst` com isolamento de raiz (`--root`), fontes
 * corporativas embarcadas (`--font-path`) e timestamp reprodutivo (`--creation-timestamp`).
 */
export async function compileTypstDocument(options: CompileTypstOptions): Promise<Buffer> {
  const typstRoot = resolveTypstRootDir();
  const fontsPath = join(typstRoot, 'fonts');

  const resolvedDocumentPath = isAbsolute(options.documentPath)
    ? options.documentPath
    : resolve(typstRoot, options.documentPath);

  if (!existsSync(resolvedDocumentPath)) {
    throw new Error(`Documento Typst não encontrado: ${resolvedDocumentPath}`);
  }

  const args: string[] = [
    'compile',
    '--root',
    typstRoot,
    '--font-path',
    fontsPath,
  ];

  appendTimestampArg(options.creationTimestamp, args);
  const tempJsonPath = prepareDataInput(typstRoot, options.data, args);
  appendExtraInputs(options.inputs, args);

  args.push(resolvedDocumentPath, '-');

  try {
    return await spawnTypstProcess(args);
  } finally {
    cleanupTempFile(tempJsonPath);
  }
}
