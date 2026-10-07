import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import OptionPicker from './acerola-option-picker.svelte';

const few = [
  { value: 'open', label: 'Abertos' },
  { value: 'done', label: 'Resolvidos' },
];

/** Sete opções: uma a mais do que cabe em pastilha, então o campo vira botão com busca. */
const many = Array.from({ length: 7 }, (_value, index) => ({
  value: `option-${index}`,
  label: `Opção ${index}`,
}));

/** Seis opções: ainda são pastilhas numa barra de filtro, mas não cabem num campo de formulário. */
const six = Array.from({ length: 6 }, (_value, index) => ({
  value: `type-${index}`,
  label: `Tipo ${index}`,
}));

describe('AcerolaOptionPicker — in a form', () => {
  // feliz
  /* Num campo de formulário, pastilha só serve enquanto cabe em uma linha. */
  it('keeps up to three options as pills, one column each', () => {
    const three = six.slice(0, 3);
    render(OptionPicker, {
      props: {
        data: { value: 'type-0', options: three },
        ui: { ariaLabel: 'Tipo', fullWidth: true },
        actions: { onChange: vi.fn() },
      },
    });

    for (const option of three)
      expect(screen.getByRole('button', { name: option.label })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Tipo' }).className).toContain('grid-cols-3');
  });

  /* Com mais de três, vira a lista que abre: as opções não ficam espalhadas pelo diálogo. */
  it('turns into the dropdown when there are more than three options', () => {
    render(OptionPicker, {
      props: {
        data: { value: 'type-4', options: six },
        ui: { ariaLabel: 'Tipo', fullWidth: true },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.queryByRole('group')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Tipo 0' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Tipo' })).toHaveTextContent('Tipo 4');
  });

  // triste
  /* A mesma lista de seis, numa barra de filtro, continua em pastilhas: lá há largura. */
  it('still shows six options as pills in a filter bar', () => {
    render(OptionPicker, {
      props: { data: { value: '', options: six }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Tipo 5' })).toBeInTheDocument();
  });
});

describe('AcerolaOptionPicker', () => {
  // feliz
  /* Com poucas opções a pessoa compara e troca com um clique, sem abrir nada. */
  it('lays few options out as pills, all visible at once', () => {
    render(OptionPicker, {
      props: { data: { value: 'open', options: few }, actions: { onChange: vi.fn() } },
    });

    expect(screen.getByRole('button', { name: 'Abertos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolvidos' })).toBeInTheDocument();
  });

  it('reports which option was chosen', async () => {
    const onChange = vi.fn();
    render(OptionPicker, {
      props: { data: { value: 'open', options: few }, actions: { onChange } },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Resolvidos' }));

    expect(onChange).toHaveBeenCalledWith('done');
  });

  /* "Todos" representa o valor vazio — é o que faz o filtro voltar a não filtrar. */
  it('adds the all option in front and reports it as the empty value', async () => {
    const onChange = vi.fn();
    render(OptionPicker, {
      props: {
        data: { value: 'open', options: few },
        ui: { allLabel: 'Todos os status' },
        actions: { onChange },
      },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Todos os status' }));

    expect(onChange).toHaveBeenCalledWith('');
  });

  /* Pastilha lado a lado com muitas opções viraria uma parede de botões. */
  it('turns into a single button with search when there are too many options', () => {
    render(OptionPicker, {
      props: {
        data: { value: 'option-3', options: many },
        ui: { placeholder: 'Selecione' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('button', { name: /Opção 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Opção 5' })).not.toBeInTheDocument();
  });

  // triste
  /* `userEvent`, e não `fireEvent`: o `fireEvent` dispara o evento na marra e o botão
     desabilitado responde assim mesmo, o que nenhum navegador faz. O teste precisa recusar
     o clique pelo mesmo motivo que o navegador recusa. */
  it('does not report anything while disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(OptionPicker, {
      props: {
        data: { value: 'open', options: few },
        state: { isDisabled: true },
        actions: { onChange },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Resolvidos' }));

    expect(onChange).not.toHaveBeenCalled();
  });

  /* Valor que não está na lista é filtro salvo de uma versão anterior da tela: o campo mostra
     o texto de "nada escolhido" em vez do valor cru. */
  it('falls back to the placeholder when the chosen value is not in the list (edge case)', () => {
    render(OptionPicker, {
      props: {
        data: { value: 'sumiu', options: many },
        ui: { placeholder: 'Selecione' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('button', { name: /Selecione/ })).toBeInTheDocument();
  });

  it('draws nothing to choose from when there is no option (edge case)', () => {
    render(OptionPicker, {
      props: {
        data: { value: '', options: [] },
        ui: { ariaLabel: 'Situação' },
        actions: { onChange: vi.fn() },
      },
    });

    expect(screen.getByRole('group', { name: 'Situação' }).children).toHaveLength(0);
  });
});
