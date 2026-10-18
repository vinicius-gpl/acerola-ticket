import { render, screen, fireEvent, within } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import AgentDownloadView from './acerola-agent-download-view.svelte';
const releases = [
  { version: '1.2.3', publishedAt: '2026-10-16T12:00:00.000Z', sizeBytes: 45_000_000, isLts: true },
  { version: '1.1.0', publishedAt: '2026-09-30T12:00:00.000Z', sizeBytes: 44_000_000, isLts: false },
];
const data = {
  release: { version: '1.2.3', publishedAt: '2026-10-16T12:00:00.000Z', sizeBytes: 45_000_000 },
  releases: [],
};
const state = {
  isLoading: false,
  error: null,
  downloadError: null,
  downloading: null,
  isLoadingReleases: false,
  releasesError: null,
  downloadingVersion: null,
};
const actions = () => ({
  onRetry: vi.fn(),
  onDownload: vi.fn(),
  onDownloadVersion: vi.fn(),
  onDownloadInstallerScript: vi.fn(),
});

describe('AcerolaAgentDownloadView', () => {
  // feliz
  it('shows the LTS and requests each installation artifact separately', async () => {
    const callbacks = actions();
    render(AgentDownloadView, { data, state, actions: callbacks });
    expect(screen.getByText('Acerola Agent 1.2.3')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Baixar instalador' }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Baixar script de instalação (install-agent.ps1)' }),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Baixar certificado' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Baixar script do certificado' }));
    expect(callbacks.onDownloadInstallerScript).toHaveBeenCalledOnce();
    expect(callbacks.onDownload.mock.calls).toEqual([
      ['msi'],
      ['certificate'],
      ['certificateScript'],
    ]);
  });
  // triste
  it('offers no download when no LTS has been promoted', () => {
    render(AgentDownloadView, { data: { release: null, releases: [] }, state, actions: actions() });
    expect(screen.getByText('Nenhuma versão LTS disponível')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Baixar instalador' })).not.toBeInTheDocument();
  });
  it('announces storage errors and allows retry', async () => {
    const callbacks = actions();
    render(AgentDownloadView, {
      data: { release: null, releases: [] },
      state: { ...state, error: 'Não consegui consultar a versão.' },
      actions: callbacks,
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui consultar a versão.');
    await fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(callbacks.onRetry).toHaveBeenCalledOnce();
  });
  it('disables other files while preparing one download', () => {
    render(AgentDownloadView, {
      data,
      state: { ...state, downloading: 'msi' },
      actions: actions(),
    });
    expect(screen.getByRole('button', { name: 'Baixar certificado' })).toBeDisabled();
  });

  // feliz
  /* Qualquer versão publicada baixa pela lista, e a LTS vem marcada. */
  it('lists every published version and downloads a file of an older one', async () => {
    const callbacks = actions();
    render(AgentDownloadView, { data: { ...data, releases }, state, actions: callbacks });

    const older = screen.getByText('1.1.0').closest('li') as HTMLElement;
    await fireEvent.click(within(older).getByRole('button', { name: 'MSI' }));

    expect(screen.getByText('LTS')).toBeInTheDocument();
    expect(callbacks.onDownloadVersion).toHaveBeenCalledWith('1.1.0', 'msi');
  });

  // triste
  it('still lists the versions when no LTS has been promoted', () => {
    render(AgentDownloadView, { data: { release: null, releases }, state, actions: actions() });

    expect(screen.getByText('Nenhuma versão LTS disponível')).toBeInTheDocument();
    expect(screen.getByText('1.1.0')).toBeInTheDocument();
  });

  it('says so when nothing was published', () => {
    render(AgentDownloadView, { data, state, actions: actions() });

    expect(screen.getByText('Nenhuma versão do agente foi publicada ainda.')).toBeInTheDocument();
  });
});
