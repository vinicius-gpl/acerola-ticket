import { describe, expect, it, vi } from 'vitest';

import * as downloadModule from './download-file.util';
import {
  downloadAgentInstallerScript,
  generateAgentInstallerScript,
} from './agent-installer-script.util';

describe('agent-installer-script.util', () => {
  describe('generateAgentInstallerScript', () => {
    // feliz
    it('generates a complete PowerShell script with placeholders when no options are given', () => {
      const script = generateAgentInstallerScript();

      expect(script).toContain("[string]$ServerUrl = '__SERVER_URL__'");
      expect(script).toContain("[string]$Token = '__TOKEN__'");
      expect(script).toContain('Start-Process powershell.exe -ArgumentList $argsList -Verb RunAs');
      expect(script).toContain('Import-Certificate');
      expect(script).toContain('msiexec.exe');
      expect(script).toContain('ProtectedData]::Protect');
      expect(script).toContain('machine.json');
      expect(script).toContain("Restart-Service -Name 'AcerolaAgent'");
    });

    // feliz
    it('embeds custom serverUrl and token when provided', () => {
      const script = generateAgentInstallerScript({
        serverUrl: 'https://chamados.empresa.com',
        token: 'agt_secret_1234567890',
      });

      expect(script).toContain("[string]$ServerUrl = 'https://chamados.empresa.com'");
      expect(script).toContain("[string]$Token = 'agt_secret_1234567890'");
    });

    // triste
    it('sanitizes dangerous characters like quotes and newlines to prevent injection', () => {
      const script = generateAgentInstallerScript({
        serverUrl: "https://bad.com'; Write-Host 'pwned\n",
        token: 'token"with`quotes$var\r\n',
      });

      expect(script).not.toContain("https://bad.com';");
      expect(script).not.toContain("Write-Host 'pwned");
      expect(script).toContain("[string]$ServerUrl = 'https://bad.com; Write-Host pwned'");
      expect(script).toContain("[string]$Token = 'tokenwithquotesvar'");
    });
  });

  describe('downloadAgentInstallerScript', () => {
    // feliz
    it('creates a blob and triggers browser download with the default filename', () => {
      const spy = vi.spyOn(downloadModule, 'triggerBrowserDownload').mockImplementation(() => {});

      downloadAgentInstallerScript({
        serverUrl: 'https://chamados.empresa.com',
        token: 'token-abc',
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0]?.[1]).toBe('install-agent.ps1');
      expect(spy.mock.calls[0]?.[0]).toBeInstanceOf(Blob);

      spy.mockRestore();
    });

    // feliz
    it('respects a custom filename when provided', () => {
      const spy = vi.spyOn(downloadModule, 'triggerBrowserDownload').mockImplementation(() => {});

      downloadAgentInstallerScript({
        serverUrl: 'https://chamados.empresa.com',
        token: 'token-abc',
        fileName: 'instalar-recepcao-01.ps1',
      });

      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.calls[0]?.[1]).toBe('instalar-recepcao-01.ps1');

      spy.mockRestore();
    });
  });
});
