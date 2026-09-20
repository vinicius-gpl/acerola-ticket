// Dashboard do Acerola Agent: nada de framework, nada de polling por
// reload — uma conexão WebSocket recebe um snapshot de métricas por
// segundo e atualiza o DOM e uns gráficos de canvas desenhados à mão.
// Justificativa da stack: para um único painel local, sem build step,
// um bundler ou lib de charts seria peso morto — canvas 2D nativo já
// dá conta de sparklines de série temporal com poucas dezenas de linhas.
(function () {
  'use strict';

  const MAX_POINTS = 120; // ~2 minutos de histórico a 1 amostra/segundo

  function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function bytes(n) {
    if (!n || n <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i += 1;
    }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function bytesPerSec(n) {
    return `${bytes(n)}/s`;
  }

  function uptime(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }

  // Sparkline: gráfico de linha(s) de série temporal num <canvas>, com
  // eixo Y auto-escalado (ou fixo, para percentuais 0-100) e cores lidas
  // das variáveis CSS do tema atual a cada redesenho, para acompanhar a
  // troca de tema sem precisar recriar o gráfico.
  class Sparkline {
    constructor(canvas, colorVars, { fixedMax } = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.colorVars = colorVars;
      this.fixedMax = fixedMax;
      this.series = colorVars.map(() => []);
    }

    push(values) {
      values.forEach((v, i) => {
        const s = this.series[i];
        s.push(v);
        if (s.length > MAX_POINTS) s.shift();
      });
      this.draw();
    }

    draw() {
      const { canvas, ctx } = this;
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = canvas.clientWidth || 1;
      const cssHeight = canvas.clientHeight || 1;
      if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      let max = this.fixedMax;
      if (max === undefined) {
        max = 1;
        this.series.forEach((s) => s.forEach((v) => { if (v > max) max = v; }));
        max *= 1.2;
      }

      const stepX = cssWidth / Math.max(MAX_POINTS - 1, 1);
      this.series.forEach((s, i) => {
        if (s.length < 2) return;
        const offset = MAX_POINTS - s.length;
        ctx.beginPath();
        s.forEach((v, idx) => {
          const x = (offset + idx) * stepX;
          const y = cssHeight - Math.min(v / max, 1) * (cssHeight - 2) - 1;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = getCSSVar(this.colorVars[i]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }
  }

  // --- tema -----------------------------------------------------------

  const THEME_KEY = 'acerola-agent-theme';
  const root = document.documentElement;
  const themeToggle = document.getElementById('theme-toggle');

  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    themeToggle.textContent = theme === 'catppuccin-latte' ? '☀️' : '🌙';
    localStorage.setItem(THEME_KEY, theme);
    // Temas trocam as cores das --chart-N; redesenha tudo com as novas.
    Object.values(charts).forEach((c) => c.draw());
  }

  themeToggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') || 'catppuccin-mocha';
    applyTheme(current === 'catppuccin-mocha' ? 'catppuccin-latte' : 'catppuccin-mocha');
  });

  // --- gráficos ---------------------------------------------------------

  const charts = {
    cpu: new Sparkline(document.getElementById('cpu-chart'), ['--chart-5'], { fixedMax: 100 }),
    mem: new Sparkline(document.getElementById('mem-chart'), ['--chart-4'], { fixedMax: 100 }),
    net: new Sparkline(document.getElementById('net-chart'), ['--chart-5', '--chart-2']),
    disk: new Sparkline(document.getElementById('disk-chart'), ['--chart-3', '--chart-1']),
  };

  applyTheme(localStorage.getItem(THEME_KEY) || 'catppuccin-mocha');

  // --- elementos ----------------------------------------------------

  const el = {
    hostSummary: document.getElementById('host-summary'),
    connStatus: document.getElementById('conn-status'),
    cpuTotal: document.getElementById('cpu-total'),
    cpuCores: document.getElementById('cpu-cores'),
    memTotal: document.getElementById('mem-total'),
    memDetail: document.getElementById('mem-detail'),
    swapDetail: document.getElementById('swap-detail'),
    netRate: document.getElementById('net-rate'),
    diskRate: document.getElementById('disk-rate'),
    diskVolumes: document.getElementById('disk-volumes'),
    processCount: document.getElementById('process-count'),
    processRows: document.getElementById('process-rows'),
    inventoryList: document.getElementById('inventory-list'),
  };

  let cpuCoreBars = [];

  function ensureCoreBars(count) {
    if (cpuCoreBars.length === count) return;
    el.cpuCores.innerHTML = '';
    cpuCoreBars = [];
    for (let i = 0; i < count; i += 1) {
      const bar = document.createElement('div');
      bar.className = 'core-bar';
      bar.title = `núcleo ${i}`;
      const fill = document.createElement('span');
      bar.appendChild(fill);
      el.cpuCores.appendChild(bar);
      cpuCoreBars.push(fill);
    }
  }

  function render(snap) {
    const host = snap.host;
    el.hostSummary.textContent =
      `${host.hostname} · ${host.platform} (${host.arch}) · ${host.localIp || 'sem IP'} · online há ${uptime(host.uptimeSeconds)}`;

    // CPU
    el.cpuTotal.textContent = `${snap.cpu.percentTotal.toFixed(0)}%`;
    charts.cpu.push([snap.cpu.percentTotal]);
    ensureCoreBars(snap.cpu.percentPerCore.length);
    snap.cpu.percentPerCore.forEach((pct, i) => {
      cpuCoreBars[i].style.height = `${Math.max(pct, 2)}%`;
    });

    // Memória
    el.memTotal.textContent = `${snap.memory.usedPercent.toFixed(0)}%`;
    charts.mem.push([snap.memory.usedPercent]);
    el.memDetail.textContent = `${bytes(snap.memory.usedBytes)} usados de ${bytes(snap.memory.totalBytes)}`;
    el.swapDetail.textContent = snap.memory.swapTotalBytes
      ? `swap: ${snap.memory.swapUsedPercent.toFixed(0)}% (${bytes(snap.memory.swapUsedBytes)} de ${bytes(snap.memory.swapTotalBytes)})`
      : 'swap: nenhuma';

    // Rede (soma de todas as interfaces ativas)
    const netRecv = (snap.network || []).reduce((sum, n) => sum + n.bytesRecvPerSec, 0);
    const netSent = (snap.network || []).reduce((sum, n) => sum + n.bytesSentPerSec, 0);
    el.netRate.textContent = `↓${bytesPerSec(netRecv)} ↑${bytesPerSec(netSent)}`;
    charts.net.push([netRecv, netSent]);

    // Disco
    el.diskRate.textContent = `↓${bytesPerSec(snap.diskIo.readBytesPerSec)} ↑${bytesPerSec(snap.diskIo.writeBytesPerSec)}`;
    charts.disk.push([snap.diskIo.readBytesPerSec, snap.diskIo.writeBytesPerSec]);

    el.diskVolumes.innerHTML = '';
    (snap.disks || []).forEach((d) => {
      const row = document.createElement('div');
      row.className = 'disk-volume';
      row.innerHTML = `
        <span title="${d.mountpoint}">${d.mountpoint}</span>
        <span class="disk-volume-bar"><span style="width:${d.usedPercent}%"></span></span>
        <span>${bytes(d.freeBytes)} livres</span>
      `;
      el.diskVolumes.appendChild(row);
    });

    // Processos
    el.processCount.textContent = `top ${snap.processes.length}`;
    el.processRows.innerHTML = '';
    snap.processes.forEach((p) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${p.pid}</td>
        <td>${p.name}</td>
        <td>${p.cpuPercent.toFixed(1)}</td>
        <td>${p.memPercent.toFixed(1)}</td>
        <td>${bytes(p.memBytes)}</td>
      `;
      el.processRows.appendChild(row);
    });

    // Inventário (dados relevantes para provisionamento)
    const inv = [
      ['Hostname', host.hostname],
      ['IP local', host.localIp || '—'],
      ['MAC', host.macAddress || '—'],
      ['Sistema', `${host.platform} ${host.platformVersion}`],
      ['Kernel', host.kernelVersion],
      ['Arquitetura', host.arch],
      ['CPU', host.cpuModel],
      ['Núcleos', `${host.logicalCpus} lógicos / ${host.physicalCpus} físicos`],
      ['Memória total', bytes(host.totalMemoryBytes)],
      ['Disco total', `${bytes(host.totalDiskBytes)} (${bytes(host.freeDiskBytes)} livres)`],
      ['Ligado desde', new Date(host.bootTime).toLocaleString('pt-BR')],
    ];
    el.inventoryList.innerHTML = inv
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
      .join('');
  }

  // --- websocket com reconexão ------------------------------------------

  function setStatus(state, label) {
    el.connStatus.dataset.state = state;
    el.connStatus.textContent = label;
  }

  function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${proto}://${location.host}/ws`);

    socket.addEventListener('open', () => setStatus('online', 'ao vivo'));
    socket.addEventListener('message', (event) => {
      try {
        render(JSON.parse(event.data));
      } catch (err) {
        console.error('snapshot inválido', err);
      }
    });
    socket.addEventListener('close', () => {
      setStatus('offline', 'reconectando…');
      setTimeout(connect, 2000);
    });
    socket.addEventListener('error', () => socket.close());
  }

  setStatus('connecting', 'conectando');
  connect();
}());
