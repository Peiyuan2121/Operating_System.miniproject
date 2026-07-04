/**
 * Main Application Controller
 * Wires up engine, renderer, and UI controls.
 */

import './style.css';
import { MemoryManager, Block, Process, createDefaultScenario } from './engine.js';
import { Renderer } from './renderer.js';
import { initParticles } from './particles.js';

// ── State ──
let scenario = createDefaultScenario();
let blocks = scenario.blocks.map(b => b.clone());
let processes = [...scenario.processes];

let mmNextFit = new MemoryManager(blocks);
let mmWorstFit = new MemoryManager(blocks);
const renderer = new Renderer();

let isNextFitRunning = false;
let isWorstFitRunning = false;
let animSpeed = 600;

// ── Initialization ──
document.addEventListener('DOMContentLoaded', () => {
  initParticles('particle-canvas');
  bindControls();
  resetSimulation();
});

function bindControls() {
  document.getElementById('btn-nf-step').addEventListener('click', stepNextFit);
  document.getElementById('btn-nf-run').addEventListener('click', runNextFit);
  document.getElementById('btn-wf-step').addEventListener('click', stepWorstFit);
  document.getElementById('btn-wf-run').addEventListener('click', runWorstFit);
  document.getElementById('btn-reset').addEventListener('click', resetSimulation);
  document.getElementById('btn-add-block').addEventListener('click', addBlock);
  document.getElementById('btn-add-process').addEventListener('click', addProcess);
}

function resetSimulation() {
  isNextFitRunning = false;
  isWorstFitRunning = false;

  blocks = scenario.blocks.map(b => b.clone());

  mmNextFit = new MemoryManager(blocks);
  mmWorstFit = new MemoryManager(blocks);
  mmNextFit.setProcesses(processes);
  mmWorstFit.setProcesses(processes);

  updateButtons();
  renderAll();

  renderer.clearLog('log-nextfit');
  renderer.clearLog('log-worstfit');
  renderer.appendLog('log-nextfit', ['⏳ Ready — press Step or Run to begin...'], 'info');
  renderer.appendLog('log-worstfit', ['⏳ Ready — press Step or Run to begin...'], 'info');

  // Remove completion banners
  const nfBanner = document.getElementById('banner-nextfit');
  const wfBanner = document.getElementById('banner-worstfit');
  if (nfBanner) nfBanner.innerHTML = '';
  if (wfBanner) wfBanner.innerHTML = '';

  // Clear comparison table
  const compTable = document.getElementById('comparison-body');
  if (compTable) compTable.innerHTML = '';

  renderConfig();
}

function renderAll() {
  renderer.renderBlocks('racks-nextfit', mmNextFit.blocks, mmNextFit.nextPointer, 'nextfit');
  renderer.renderBlocks('racks-worstfit', mmWorstFit.blocks, -1, 'worstfit');
  renderer.renderProcessQueue('queue-nextfit', processes, mmNextFit.currentProcessIndex);
  renderer.renderProcessQueue('queue-worstfit', processes, mmWorstFit.currentProcessIndex);
  renderer.renderStats('stats-nextfit', mmNextFit.getStats());
  renderer.renderStats('stats-worstfit', mmWorstFit.getStats());
}

async function stepNextFit() {
  if (isNextFitRunning) return;
  isNextFitRunning = true;
  updateButtons();

  await stepNextFitLogical();

  isNextFitRunning = false;
  updateButtons();
}

async function stepNextFitLogical() {
  if (mmNextFit.isComplete()) return;

  const nfBlocksBefore = mmNextFit.blocks.map(b => b.clone());
  const nfIdxBefore = mmNextFit.currentProcessIndex;
  const nfPointerBefore = mmNextFit.nextPointer;

  const nfResult = mmNextFit.nextFitStep();

  renderer.renderBlocks('racks-nextfit', nfBlocksBefore, nfPointerBefore, 'nextfit');
  renderer.renderProcessQueue('queue-nextfit', processes, nfIdxBefore);

  if (nfResult) {
    await renderer.animateStep('racks-nextfit', nfResult, () => {
      renderer.renderBlocks('racks-nextfit', mmNextFit.blocks, mmNextFit.nextPointer, 'nextfit');
    }, 'log-nextfit');
  }

  renderNextFitStateOnly();

  if (mmNextFit.isComplete()) {
    showNfCompletion();
  }
}

async function runNextFit() {
  if (isNextFitRunning) return;
  isNextFitRunning = true;
  updateButtons();

  while (!mmNextFit.isComplete() && isNextFitRunning) {
    await stepNextFitLogical();
    if (!mmNextFit.isComplete() && isNextFitRunning) {
      await renderer.wait(200);
    }
  }

  isNextFitRunning = false;
  updateButtons();
}

async function stepWorstFit() {
  if (isWorstFitRunning) return;
  isWorstFitRunning = true;
  updateButtons();

  await stepWorstFitLogical();

  isWorstFitRunning = false;
  updateButtons();
}

async function stepWorstFitLogical() {
  if (mmWorstFit.isComplete()) return;

  const wfBlocksBefore = mmWorstFit.blocks.map(b => b.clone());
  const wfIdxBefore = mmWorstFit.currentProcessIndex;

  const wfResult = mmWorstFit.worstFitStep();

  renderer.renderBlocks('racks-worstfit', wfBlocksBefore, -1, 'worstfit');
  renderer.renderProcessQueue('queue-worstfit', processes, wfIdxBefore);

  if (wfResult) {
    await renderer.animateStep('racks-worstfit', wfResult, () => {
      renderer.renderBlocks('racks-worstfit', mmWorstFit.blocks, -1, 'worstfit');
    }, 'log-worstfit');
  }

  renderWorstFitStateOnly();

  if (mmWorstFit.isComplete()) {
    showWfCompletion();
  }
}

async function runWorstFit() {
  if (isWorstFitRunning) return;
  isWorstFitRunning = true;
  updateButtons();

  while (!mmWorstFit.isComplete() && isWorstFitRunning) {
    await stepWorstFitLogical();
    if (!mmWorstFit.isComplete() && isWorstFitRunning) {
      await renderer.wait(200);
    }
  }

  isWorstFitRunning = false;
  updateButtons();
}

function renderNextFitStateOnly() {
  renderer.renderBlocks('racks-nextfit', mmNextFit.blocks, mmNextFit.nextPointer, 'nextfit');
  renderer.renderProcessQueue('queue-nextfit', processes, mmNextFit.currentProcessIndex);
  renderer.renderStats('stats-nextfit', mmNextFit.getStats());
}

function renderWorstFitStateOnly() {
  renderer.renderBlocks('racks-worstfit', mmWorstFit.blocks, -1, 'worstfit');
  renderer.renderProcessQueue('queue-worstfit', processes, mmWorstFit.currentProcessIndex);
  renderer.renderStats('stats-worstfit', mmWorstFit.getStats());
}

function showNfCompletion() {
  const nfStats = mmNextFit.getStats();
  const nfBanner = document.getElementById('banner-nextfit');

  if (nfBanner) {
    nfBanner.innerHTML = `
      <div class="completion-banner">
        <h3>✅ Next Fit Complete</h3>
        <p>${nfStats.success} allocated / ${nfStats.fail} failed — ${nfStats.rate}% success — ${nfStats.utilization}% memory used</p>
      </div>`;
  }

  checkAndShowComparison();
}

function showWfCompletion() {
  const wfStats = mmWorstFit.getStats();
  const wfBanner = document.getElementById('banner-worstfit');

  if (wfBanner) {
    wfBanner.innerHTML = `
      <div class="completion-banner">
        <h3>✅ Worst Fit Complete</h3>
        <p>${wfStats.success} allocated / ${wfStats.fail} failed — ${wfStats.rate}% success — ${wfStats.utilization}% memory used</p>
      </div>`;
  }

  checkAndShowComparison();
}

function checkAndShowComparison() {
  if (mmNextFit.isComplete() && mmWorstFit.isComplete()) {
    buildComparisonTable(mmNextFit.getStats(), mmWorstFit.getStats());
  }
}

function buildComparisonTable(nf, wf) {
  const tbody = document.getElementById('comparison-body');
  if (!tbody) return;

  const rows = [
    { label: 'Allocated', nf: nf.success, wf: wf.success, higher: true },
    { label: 'Failed', nf: nf.fail, wf: wf.fail, higher: false },
    { label: 'Success Rate', nf: nf.rate + '%', wf: wf.rate + '%', higher: true, nfVal: parseFloat(nf.rate), wfVal: parseFloat(wf.rate) },
    { label: 'Memory Used', nf: nf.utilization + '%', wf: wf.utilization + '%', higher: true, nfVal: parseFloat(nf.utilization), wfVal: parseFloat(wf.utilization) },
  ];

  tbody.innerHTML = '';
  rows.forEach(row => {
    const nfVal = row.nfVal !== undefined ? row.nfVal : row.nf;
    const wfVal = row.wfVal !== undefined ? row.wfVal : row.wf;
    const nfWins = row.higher ? nfVal > wfVal : nfVal < wfVal;
    const wfWins = row.higher ? wfVal > nfVal : wfVal < nfVal;
    const tie = nfVal === wfVal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="metric-name">${row.label}</td>
      <td class="${!tie && nfWins ? 'winner' : (!tie && wfWins ? 'loser' : '')}">${row.nf}</td>
      <td class="${!tie && wfWins ? 'winner' : (!tie && nfWins ? 'loser' : '')}">${row.wf}</td>
    `;
    tbody.appendChild(tr);
  });

  // Also show block-by-block comparison
  const blockRow = document.createElement('tr');
  blockRow.innerHTML = `<td class="metric-name" colspan="3" style="padding-top:12px; color: var(--text-dim);">Block Remaining (KB)</td>`;
  tbody.appendChild(blockRow);

  for (let i = 0; i < mmNextFit.blocks.length; i++) {
    const nfBlock = mmNextFit.blocks[i];
    const wfBlock = mmWorstFit.blocks[i];
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="metric-name">Block ${nfBlock.id}</td>
      <td>${nfBlock.freeSize} KB</td>
      <td>${wfBlock.freeSize} KB</td>
    `;
    tbody.appendChild(tr);
  }
}

function updateButtons() {
  const stepNfBtn = document.getElementById('btn-nf-step');
  const runNfBtn = document.getElementById('btn-nf-run');
  const stepWfBtn = document.getElementById('btn-wf-step');
  const runWfBtn = document.getElementById('btn-wf-run');

  if (stepNfBtn) stepNfBtn.disabled = isNextFitRunning || mmNextFit.isComplete();
  if (runNfBtn) runNfBtn.disabled = isNextFitRunning || mmNextFit.isComplete();
  if (stepWfBtn) stepWfBtn.disabled = isWorstFitRunning || mmWorstFit.isComplete();
  if (runWfBtn) runWfBtn.disabled = isWorstFitRunning || mmWorstFit.isComplete();
}

// ── Configuration UI ──
function renderConfig() {
  renderBlockConfig();
  renderProcessConfig();
}

function renderBlockConfig() {
  const container = document.getElementById('config-blocks');
  container.innerHTML = '';
  scenario.blocks.forEach((block, i) => {
    const row = document.createElement('div');
    row.className = 'config-row';
    row.innerHTML = `
      <span class="tag">B${block.id}</span>
      <input type="number" value="${block.originalSize}" min="1" data-block-index="${i}" class="block-size-input" />
      <span class="tag">KB</span>
      <button class="mini-btn" data-remove-block="${i}">✕</button>
    `;
    container.appendChild(row);
  });

  // Bind size change
  container.querySelectorAll('.block-size-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.blockIndex);
      const newSize = parseInt(e.target.value);
      if (newSize > 0) {
        scenario.blocks[idx] = new Block(scenario.blocks[idx].id, newSize);
        resetSimulation();
      }
    });
  });

  // Bind remove
  container.querySelectorAll('[data-remove-block]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.removeBlock);
      scenario.blocks.splice(idx, 1);
      // Re-number
      scenario.blocks.forEach((b, i) => b.id = i + 1);
      resetSimulation();
    });
  });
}

function renderProcessConfig() {
  const container = document.getElementById('config-processes');
  container.innerHTML = '';
  processes.forEach((proc, i) => {
    const row = document.createElement('div');
    row.className = 'config-row';
    row.innerHTML = `
      <span class="tag" style="color: ${proc.color};">${proc.name}</span>
      <input type="number" value="${proc.size}" min="1" data-proc-index="${i}" class="proc-size-input" />
      <span class="tag">KB</span>
      <button class="mini-btn" data-remove-proc="${i}">✕</button>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('.proc-size-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.procIndex);
      const newSize = parseInt(e.target.value);
      if (newSize > 0) {
        processes[idx] = new Process(processes[idx].name, newSize, processes[idx].color);
        resetSimulation();
      }
    });
  });

  container.querySelectorAll('[data-remove-proc]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.removeProc);
      processes.splice(idx, 1);
      // Re-name
      processes.forEach((p, i) => p.name = `P${i + 1}`);
      resetSimulation();
    });
  });
}

function addBlock() {
  const newId = scenario.blocks.length + 1;
  const size = Math.floor(Math.random() * 400) + 100;
  scenario.blocks.push(new Block(newId, size));
  resetSimulation();
}

function addProcess() {
  const newIdx = processes.length;
  const size = Math.floor(Math.random() * 300) + 50;
  const color = scenario.processColors[newIdx % scenario.processColors.length];
  processes.push(new Process(`P${newIdx + 1}`, size, color));
  resetSimulation();
}
