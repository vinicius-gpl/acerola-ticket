import { describe, expect, it } from 'vitest';

import {
  classifyEvent,
  defaultSeverityOf,
  networkEventTypeLabel,
  networkSeverityLabel,
  outageDurationSeconds,
} from './network-event.util';

describe('networkEventTypeLabel', () => {
  // feliz
  it('reads the event in the words of someone who lost the internet', () => {
    expect(networkEventTypeLabel('wan_down')).toBe('Internet caiu');
    expect(networkEventTypeLabel('wan_up')).toBe('Internet voltou');
  });
});

describe('networkSeverityLabel', () => {
  // feliz
  it('reads the severity on screen in Portuguese', () => {
    expect(networkSeverityLabel('critical')).toBe('Grave');
  });
});

describe('defaultSeverityOf', () => {
  // feliz
  /* A internet cair é grave e ponto: o escritório inteiro para. */
  it('treats an outage as grave and a recovery as plain news', () => {
    expect(defaultSeverityOf('wan_down')).toBe('critical');
    expect(defaultSeverityOf('wan_up')).toBe('info');
  });

  it('treats slowness and packet loss as something to look at', () => {
    expect(defaultSeverityOf('high_latency')).toBe('attention');
    expect(defaultSeverityOf('packet_loss')).toBe('attention');
  });
});

describe('classifyEvent', () => {
  // feliz
  it('recognises the outage alerts the UniFi sends', () => {
    expect(classifyEvent('WAN Offline')).toBe('wan_down');
    expect(classifyEvent('Internet Outage detected')).toBe('wan_down');
    expect(classifyEvent('WAN1 is back online')).toBe('wan_up');
    expect(classifyEvent('WAN Failover to WAN2')).toBe('failover');
    expect(classifyEvent('High Latency on WAN1')).toBe('high_latency');
    expect(classifyEvent('Packet Loss detected')).toBe('packet_loss');
  });

  it('does not care about upper or lower case', () => {
    expect(classifyEvent('wan offline')).toBe('wan_down');
  });

  // triste
  /* Um aviso que ninguém classificou ainda é um aviso: ele entra como "outro", nunca some. */
  it('keeps an unknown alert instead of dropping it', () => {
    expect(classifyEvent('Controller firmware update available')).toBe('other');
  });

  it('survives an alert with no text at all', () => {
    expect(classifyEvent(null)).toBe('other');
    expect(classifyEvent('')).toBe('other');
  });
});

describe('outageDurationSeconds', () => {
  // feliz
  it('measures how long the internet was out', () => {
    expect(
      outageDurationSeconds('2026-09-23T12:00:00.000Z', '2026-09-23T12:20:00.000Z'),
    ).toBe(1200);
  });

  // triste
  /* Sem fim, o problema está ACONTECENDO — e zero diria que já passou. */
  it('answers nothing while the problem is still happening', () => {
    expect(outageDurationSeconds('2026-09-23T12:00:00.000Z', null)).toBeNull();
  });

  it('refuses a recovery that came before the outage', () => {
    expect(
      outageDurationSeconds('2026-09-23T12:00:00.000Z', '2026-09-23T11:00:00.000Z'),
    ).toBeNull();
  });
});
