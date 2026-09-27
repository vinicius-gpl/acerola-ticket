import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Building2 from '@lucide/svelte/icons/building-2';

import StatCard from './stat-card.svelte';

describe('StatCard', () => {
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
    expect(card?.className).toContain('bg-rose-100');
    expect(card?.className).not.toMatch(/\/\d/);
  });

  it('sem tom escolhido, usa o cartão neutro do sistema', () => {
    const { container } = render(StatCard, {
      props: { data: { label: 'Total', value: 3 } },
    });

    expect(container.firstElementChild?.className).toContain('bg-card');
  });
});
