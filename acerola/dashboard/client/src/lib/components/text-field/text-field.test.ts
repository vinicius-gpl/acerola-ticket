import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TextField from './text-field.svelte';

const data = { label: 'Senha', name: 'password', value: 'senha-secreta' };

describe('TextField', () => {
  it('ties the label to the input', () => {
    render(TextField, {
      props: { data: { label: 'E-mail', name: 'email', value: '' } },
    });

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('reports every keystroke', async () => {
    const onChange = vi.fn();
    render(TextField, {
      props: { data: { label: 'E-mail', name: 'email', value: '' }, actions: { onChange } },
    });

    await userEvent.type(screen.getByLabelText('E-mail'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  /* O erro precisa existir para quem NÃO vê a tela: sem `aria-invalid` e `role="alert"` a
     mensagem está lá e o leitor de tela não a anuncia. */
  it('announces the error to assistive technology', () => {
    render(TextField, {
      props: { data, state: { error: 'A senha precisa ter ao menos 8 caracteres' } },
    });

    const input = screen.getByLabelText('Senha');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A senha precisa ter ao menos 8 caracteres',
    );
    expect(input).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
  });

  // triste
  it('does not describe the input by an error that is not there', () => {
    render(TextField, { props: { data } });

    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /* Trocar o `type` é o que mantém o gerenciador de senhas do navegador reconhecendo o
     campo; esconder por CSS quebraria isso em silêncio. */
  it('reveals the password by changing the input type', async () => {
    render(TextField, { props: { data, ui: { type: 'password' } } });

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
  });

  it('shows no reveal button on a field that is not a password', () => {
    render(TextField, {
      props: { data: { label: 'E-mail', name: 'email', value: '' }, ui: { type: 'email' } },
    });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /* O `*` é decoração de CSS (`aria-hidden`): quem ouve a tela precisa do `required` de
     verdade no campo, não de um caractere solto no meio do rótulo. */
  it('marks the field as required, for assistive technology and for CSS', () => {
    render(TextField, {
      props: { data: { label: 'Seu nome', name: 'name', value: '', isRequired: true } },
    });

    expect(screen.getByLabelText(/seu nome/i)).toBeRequired();
  });

  it('does not mark a field as required unless asked', () => {
    render(TextField, {
      props: { data: { label: 'E-mail', name: 'email', value: '' } },
    });

    expect(screen.getByLabelText('E-mail')).not.toBeRequired();
  });
});

describe('TextField as a controlled input (a parent that rejects or rewrites what was typed)', () => {
  /* O bug de verdade: `value={data.value}` + `oninput` só devolve a prop pro elemento QUANDO
     ELA MUDA. Uma letra rejeitada que resulta no MESMO valor de antes (a letra não entra em
     lugar nenhum) não muda a prop — e o navegador já tinha inserido a letra sozinho antes do
     evento chegar aqui. Sem comparar contra o valor VIVO do elemento (o que `bind:value`
     faz), essa letra ficava visível no campo mesmo com o estado da aplicação limpo por
     baixo — foi assim que "62abc999" virava "62999...abc" na tela do telefone do chamado. */
  it('corrects the rendered value even when a rejected keystroke is a no-op for the app', async () => {
    const user = userEvent.setup();
    let value = '62';

    function handleChange(next: string) {
      value = next.replace(/\D/g, ''); // rejeita qualquer letra, como um campo de telefone faria
      rendered.rerender({
        data: { label: 'Telefone', name: 'phone', value },
        actions: { onChange: handleChange },
      });
    }

    const rendered = render(TextField, {
      props: {
        data: { label: 'Telefone', name: 'phone', value },
        actions: { onChange: handleChange },
      },
    });

    await user.type(screen.getByLabelText('Telefone'), 'x');

    expect(screen.getByLabelText('Telefone')).toHaveValue('62');
  });
});

describe('TextField as a date', () => {
  // feliz
  /* Data é o mesmo campo com outro `type`: o navegador é quem desenha o seletor, e o
     rótulo, o erro e o `aria-invalid` continuam vindo daqui. */
  it('hands the browser a date input, keeping label and error', () => {
    render(TextField, {
      props: {
        data: { label: 'Data do serviço', name: 'performedAt', value: '2026-09-20' },
        ui: { type: 'date' },
        state: { error: 'Informe a data' },
      },
    });

    const field = screen.getByLabelText('Data do serviço');

    expect(field).toHaveAttribute('type', 'date');
    expect(field).toHaveValue('2026-09-20');
    expect(screen.getByText('Informe a data')).toBeInTheDocument();
  });
});
