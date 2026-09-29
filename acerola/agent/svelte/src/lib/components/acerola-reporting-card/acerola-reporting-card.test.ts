import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AcerolaReportingCard from './acerola-reporting-card.svelte';

const notConfigured = { serverUrl: '', hasToken: false, state: 'off' as const };

describe('AcerolaReportingCard', () => {
	// feliz
	it('hands over the address and the key that were typed', async () => {
		// O contrato do card: quem grava é a rota, e ela recebe os dois valores já limpos
		const onSave = vi.fn();
		render(AcerolaReportingCard, { props: { data: notConfigured, events: { onSave } } });

		await userEvent.type(screen.getByLabelText('Endereço do painel'), '  http://localhost:3005  ');
		await userEvent.type(screen.getByLabelText('Chave desta máquina'), ' chave-da-maquina ');
		await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

		expect(onSave).toHaveBeenCalledWith('http://localhost:3005', 'chave-da-maquina');
	});

	// feliz
	it('clears the key from the screen once it has been handed over', async () => {
		// A chave já foi guardada cifrada: deixá-la no campo a manteria legível à toa
		render(AcerolaReportingCard, { props: { data: notConfigured, events: { onSave: vi.fn() } } });

		const field = screen.getByLabelText('Chave desta máquina');
		await userEvent.type(screen.getByLabelText('Endereço do painel'), 'http://localhost:3005');
		await userEvent.type(field, 'chave-da-maquina');
		await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

		expect(field).toHaveValue('');
	});

	// feliz
	it('starts with the address already saved, and never with the key', () => {
		// A chave salva não volta do Go — o card só sabe que existe uma
		render(AcerolaReportingCard, {
			props: { data: { serverUrl: 'http://painel', hasToken: true, state: 'connected' } }
		});

		expect(screen.getByLabelText('Endereço do painel')).toHaveValue('http://painel');
		expect(screen.getByLabelText('Chave desta máquina')).toHaveValue('');
	});

	// feliz
	it('says what is going on for each situation', () => {
		render(AcerolaReportingCard, {
			props: { data: { serverUrl: 'http://painel', hasToken: true, state: 'rejected' } }
		});

		expect(screen.getByText('Chave recusada')).toBeInTheDocument();
		expect(screen.getByText(/não reconheceu a chave/)).toBeInTheDocument();
	});

	// triste
	it('does not save with an empty field', async () => {
		// Salvar sem chave desconfiguraria a máquina sem ninguém pedir isso
		const onSave = vi.fn();
		render(AcerolaReportingCard, { props: { data: notConfigured, events: { onSave } } });

		await userEvent.type(screen.getByLabelText('Endereço do painel'), 'http://localhost:3005');
		await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

		expect(onSave).not.toHaveBeenCalled();
	});

	// triste
	it('keeps the key out of sight while it is typed', () => {
		// Quem passa atrás de quem está instalando não lê a chave na tela
		render(AcerolaReportingCard, { props: { data: notConfigured } });

		expect(screen.getByLabelText('Chave desta máquina')).toHaveAttribute('type', 'password');
	});

	// triste
	it('shows the refusal and locks the button while saving', () => {
		render(AcerolaReportingCard, {
			props: { data: notConfigured, state: { isSaving: true, error: 'Não consegui salvar.' } }
		});

		expect(screen.getByText('Não consegui salvar.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
	});
});
