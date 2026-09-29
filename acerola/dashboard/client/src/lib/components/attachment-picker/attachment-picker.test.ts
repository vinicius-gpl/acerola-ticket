import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AttachmentPicker, { limitsSummary, reviewChoice } from './attachment-picker.svelte';

const MEGABYTE = 1024 * 1024;

/** Um arquivo de mentira com o tamanho pedido — `File` não deixa forjar `size` direto. */
function fakeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: sizeBytes });

  return file;
}

describe('reviewChoice', () => {
  // feliz
  it('accepts files that fit', () => {
    const chosen = [fakeFile('nota.pdf', 'application/pdf', MEGABYTE)];

    expect(reviewChoice(chosen, [], []).accepted).toHaveLength(1);
    expect(reviewChoice(chosen, [], []).error).toBeNull();
  });

  // triste
  it('refuses a format that is not accepted, saying so', () => {
    const { accepted, error } = reviewChoice(
      [fakeFile('tudo.zip', 'application/zip', MEGABYTE)],
      [],
      [],
    );

    expect(accepted).toHaveLength(0);
    expect(error).toContain('não é aceito');
  });

  /* O limite conta o que o chamado já tem, o que já foi escolhido e o que está sendo
     escolhido agora — senão três vídeos de uma vez passariam pelo teto de dois. */
  it('counts what is already chosen against the limit', () => {
    const video = () => fakeFile('defeito.mp4', 'video/mp4', MEGABYTE);
    const { accepted, error } = reviewChoice([video(), video(), video()], [], []);

    expect(accepted).toHaveLength(2);
    expect(error).toContain('2');
  });

  it('counts what the ticket already has', () => {
    const { error } = reviewChoice(
      [fakeFile('outro.mp4', 'video/mp4', MEGABYTE)],
      [],
      ['video', 'video'],
    );

    expect(error).toContain('vídeos');
  });

  it('refuses a file over the size of its format', () => {
    const { error } = reviewChoice([fakeFile('grande.png', 'image/png', 6 * MEGABYTE)], [], []);

    expect(error).toContain('5 MB');
  });
});

describe('AttachmentPicker', () => {
  // feliz
  it('hands over the chosen files', async () => {
    const onChange = vi.fn();
    render(AttachmentPicker, {
      props: { data: { files: [] }, actions: { onChange, onError: vi.fn() } },
    });

    await userEvent.upload(
      screen.getByLabelText('Escolher arquivos'),
      fakeFile('nota.pdf', 'application/pdf', MEGABYTE),
    );

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'nota.pdf' })]);
  });

  it('takes a chosen file back out before sending', async () => {
    const onChange = vi.fn();
    const chosen = fakeFile('nota.pdf', 'application/pdf', MEGABYTE);
    render(AttachmentPicker, {
      props: { data: { files: [chosen] }, actions: { onChange, onError: vi.fn() } },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Tirar' }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('says what fits before anyone tries', () => {
    render(AttachmentPicker, {
      props: { data: { files: [] }, actions: { onChange: vi.fn(), onError: vi.fn() } },
    });

    expect(screen.getByText(limitsSummary())).toBeInTheDocument();
  });

  // triste
  /* O `accept` do campo já barra o formato errado no seletor do sistema — mas ele é uma dica,
     não uma trava: arrastar o arquivo para a janela passa por cima dele. Quem realmente
     recusa é a conferência, e é isso que este teste prova, com um arquivo do formato certo e
     do tamanho errado. */
  it('reports the refusal instead of sending a file that will bounce', async () => {
    const onError = vi.fn();
    const onChange = vi.fn();
    render(AttachmentPicker, {
      props: { data: { files: [] }, actions: { onChange, onError } },
    });

    await userEvent.upload(
      screen.getByLabelText('Escolher arquivos'),
      fakeFile('tela.png', 'image/png', 6 * MEGABYTE),
    );

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('5 MB'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the refusal on screen', () => {
    render(AttachmentPicker, {
      props: {
        data: { files: [] },
        state: { error: 'tudo.zip: este tipo de arquivo não é aceito.' },
        actions: { onChange: vi.fn(), onError: vi.fn() },
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('não é aceito');
  });

  /**
   * O DEFEITO QUE ESTE TESTE TRANCA, e ele quebrava o diálogo inteiro.
   *
   * O campo de arquivo é `sr-only`, e `sr-only` é `position: absolute`. Sem um ancestral
   * POSICIONADO, ele se ancorava no painel do diálogo — a centenas de pixels do rótulo que o
   * aciona. Quando o seletor de arquivos do sistema fechava, o navegador devolvia o foco ao
   * campo e o rolava para dentro da vista: quem rolava era o PAINEL. O cabeçalho do chamado
   * saía por cima, sobrava um vazio embaixo do rodapé, e não havia como desfazer — o painel é
   * `overflow-hidden`, então não existe barra de rolagem para voltar.
   */
  it('keeps the hidden file field anchored to its own block, never to whatever is above', () => {
    const { container } = render(AttachmentPicker, {
      props: { data: { files: [] }, actions: { onChange: vi.fn(), onError: vi.fn() } },
    });

    const input = container.querySelector('input[type="file"]');
    const wrapper = container.firstElementChild;

    expect(input?.className).toContain('sr-only');
    /* O bloco do seletor precisa ser o ancestral posicionado do campo escondido. */
    expect(wrapper?.className).toContain('relative');
    expect(wrapper?.contains(input)).toBe(true);
  });
});
