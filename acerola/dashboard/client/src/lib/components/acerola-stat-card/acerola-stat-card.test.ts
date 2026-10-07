import { render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

import Building2 from '@lucide/svelte/icons/building-2';

import StatCard from './acerola-stat-card.svelte';

describe('AcerolaStatCard', () => {
  // feliz
  it('mostra o rótulo e o número', () => {
    render(StatCard, { props: { data: { label: 'Clientes', value: 560 } } });

    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('560')).toBeInTheDocument();
  });

  /* Um número que exclui algo precisa dizer o que excluiu, ou dois painéis passam a
     discordar sobre a mesma base sem que ninguém saiba qual está certo. */
  it('mostra a ressalva quando o número exclui alguma coisa', () => {
    render(StatCard, {
      props: { data: { label: 'Ativos', value: 641, hint: 'Exclui 1.067 arquivados' } },
    });

    expect(screen.getByText('Exclui 1.067 arquivados')).toBeInTheDocument();
  });

  // triste
  it('sem ressalva, não desenha linha vazia', () => {
    const { container } = render(StatCard, {
      props: { data: { label: 'Equipe', value: 22 } },
    });

    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  /* ZERO É RESPOSTA. Trocá-lo por traço ou esconder o cartão faria "nenhum cliente
     inativo" parecer "não sei quantas" — e as duas coisas pedem ações diferentes. */
  it('zero aparece como zero, e não como vazio', () => {
    render(StatCard, { props: { data: { label: 'Inativas', value: 0 } } });

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('carregando esconde o número em vez de mostrar um valor errado', () => {
    render(StatCard, {
      props: { data: { label: 'Clientes', value: 560 }, state: { isLoading: true } },
    });

    expect(screen.queryByText('560')).not.toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
  });

  it('aceita texto no lugar de número, para razões como "13/13"', () => {
    render(StatCard, { props: { data: { label: 'Cadastrados', value: '13/13' } } });

    expect(screen.getByText('13/13')).toBeInTheDocument();
  });

  it('com ícone, desenha o quadrado colorido', () => {
    const { container } = render(StatCard, {
      props: { data: { label: 'Clientes', value: 7 }, ui: { icon: Building2 } },
    });

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('sem ícone, não desenha quadrado nenhum', () => {
    const { container } = render(StatCard, {
      props: { data: { label: 'Clientes', value: 7 } },
    });

    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  /* A cor é do CARTÃO inteiro, não de uma borda ou barra fina — é o que faz o olho achar o
     cartão certo sem precisar ler o rótulo primeiro. */
  it('pinta o fundo do cartão inteiro com a cor da situação, sem opacidade', () => {
    const { container } = render(StatCard, {
      props: { data: { label: 'Vencidos', value: 3 }, ui: { tone: 'danger' } },
    });

    const card = container.firstElementChild;
    expect(card?.className).toContain('bg-destructive-soft');
    expect(card?.className).not.toMatch(/\/\d/);
  });

  it('sem tom escolhido, usa o cartão neutro do sistema', () => {
    const { container } = render(StatCard, {
      props: { data: { label: 'Total', value: 3 } },
    });

    expect(container.firstElementChild?.className).toContain('bg-card');
  });

  it('com onClick, vira um atalho: um botão que diz o que o clique faz', () => {
    const onClick = vi.fn();
    render(StatCard, {
      props: { data: { label: 'Abertos', value: 5 }, actions: { onClick } },
    });

    const button = screen.getByRole('button', { name: 'Abertos: filtrar a lista' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('selecionado, avisa que o clique tira o filtro e ganha o contorno', () => {
    const { container } = render(StatCard, {
      props: {
        data: { label: 'Abertos', value: 5 },
        state: { isSelected: true },
        actions: { onClick: vi.fn() },
      },
    });

    expect(screen.getByRole('button', { name: 'Abertos: tirar o filtro' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(container.firstElementChild?.className).toContain('ring-2');
  });

  // triste
  it('sem onClick, continua sendo só um número: nenhum botão', () => {
    render(StatCard, { props: { data: { label: 'Clientes', value: 560 } } });

    expect(screen.queryByRole('button')).toBeNull();
  });
});
