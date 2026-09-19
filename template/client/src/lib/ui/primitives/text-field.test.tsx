import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TextField } from './text-field.component';

const data = { label: 'Senha', name: 'password', value: 'senha-secreta' };

describe('TextField', () => {
  it('ties the label to the input', () => {
    render(<TextField data={{ label: 'E-mail', name: 'email', value: '' }} />);

    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  });

  it('reports every keystroke', async () => {
    const onChange = vi.fn();
    render(
      <TextField data={{ label: 'E-mail', name: 'email', value: '' }} actions={{ onChange }} />,
    );

    await userEvent.type(screen.getByLabelText('E-mail'), 'a');

    expect(onChange).toHaveBeenCalledWith('a');
  });

  /* O erro precisa existir para quem NÃO vê a tela: sem `aria-invalid` e `role="alert"` a
     mensagem está lá e o leitor de tela não a anuncia. */
  it('announces the error to assistive technology', () => {
    render(
      <TextField data={data} state={{ error: 'A senha precisa ter ao menos 8 caracteres' }} />,
    );

    const input = screen.getByLabelText('Senha');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A senha precisa ter ao menos 8 caracteres',
    );
    expect(input).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
  });

  it('does not describe the input by an error that is not there', () => {
    render(<TextField data={data} />);

    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-describedby');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /* Trocar o `type` é o que mantém o gerenciador de senhas do navegador reconhecendo o
     campo; esconder por CSS quebraria isso em silêncio. */
  it('reveals the password by changing the input type', async () => {
    render(<TextField data={data} ui={{ type: 'password' }} />);

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));

    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text');
  });

  it('shows no reveal button on a field that is not a password', () => {
    render(
      <TextField data={{ label: 'E-mail', name: 'email', value: '' }} ui={{ type: 'email' }} />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
