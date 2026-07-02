/**
 * Renderer — builds and animates the DOM elements for the memory visualization.
 */

export class Renderer {
  constructor() {
    this.animationSpeed = 1500; // ms per animation phase
  }

  /**
   * Render memory blocks as server rack columns inside a container element.
   * @param {string} containerId - DOM id of the container
   * @param {import('./engine').Block[]} blocks
   * @param {number} nextPointer - current Next Fit pointer index (-1 to hide)
   * @param {string} algorithmType - 'nextfit' or 'worstfit'
   */
  renderBlocks(containerId, blocks, nextPointer = -1, algorithmType = 'nextfit') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const maxSize = Math.max(...blocks.map(b => b.originalSize));
    container.innerHTML = '';

    blocks.forEach((block, index) => {
      const rack = document.createElement('div');
      rack.className = 'server-rack';
      rack.id = `${containerId}-rack-${block.id}`;

      // Rack label
      const label = document.createElement('div');
      label.className = 'rack-label';
      label.textContent = `B${block.id}`;
      rack.appendChild(label);

      // Rack body (the visual bar)
      const body = document.createElement('div');
      body.className = 'rack-body';
      const heightPx = Math.max(60, (block.originalSize / maxSize) * 280);
      body.style.height = `${heightPx}px`;

      // Fill segments for each allocation
      const totalPx = heightPx;
      block.allocations.forEach(alloc => {
        const seg = document.createElement('div');
        seg.className = 'rack-segment';
        const segH = (alloc.size / block.originalSize) * totalPx;
        seg.style.height = `${segH}px`;
        seg.style.backgroundColor = alloc.color;
        seg.title = `${alloc.processName} (${alloc.size} KB)`;

        const segLabel = document.createElement('span');
        segLabel.className = 'segment-label';
        segLabel.textContent = alloc.processName;
        seg.appendChild(segLabel);

        body.appendChild(seg);
      });

      // Free space indicator
      const freePct = block.freeSize / block.originalSize;
      const freeH = freePct * totalPx;
      if (freeH > 2) {
        const freeSeg = document.createElement('div');
        freeSeg.className = 'rack-free';
        freeSeg.style.height = `${freeH}px`;
        const freeLabel = document.createElement('span');
        freeLabel.className = 'free-label';
        freeLabel.textContent = `${block.freeSize}`;
        freeSeg.appendChild(freeLabel);
        body.appendChild(freeSeg);
      }

      rack.appendChild(body);

      // Size info
      const info = document.createElement('div');
      info.className = 'rack-info';
      info.innerHTML = `<span class="rack-total">${block.originalSize} KB</span>`;
      rack.appendChild(info);

      // Next Fit pointer indicator
      if (algorithmType === 'nextfit' && index === nextPointer) {
        const pointer = document.createElement('div');
        pointer.className = 'rack-pointer';
        pointer.innerHTML = '▲ NEXT';
        rack.appendChild(pointer);
      }

      container.appendChild(rack);
    });
  }

  /**
   * Render the process queue.
   */
  renderProcessQueue(containerId, processes, currentIndex) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    processes.forEach((p, i) => {
      const chip = document.createElement('div');
      chip.className = 'process-chip';
      if (i < currentIndex) chip.classList.add('done');
      if (i === currentIndex) chip.classList.add('current');
      if (i > currentIndex) chip.classList.add('pending');

      chip.style.setProperty('--proc-color', p.color);
      chip.innerHTML = `
        <span class="chip-name">${p.name}</span>
        <span class="chip-size">${p.size} KB</span>
      `;
      container.appendChild(chip);
    });
  }

  /**
   * Render stats panel.
   */
  renderStats(containerId, stats) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">Total</div>
      </div>
      <div class="stat-item success">
        <div class="stat-value">${stats.success}</div>
        <div class="stat-label">Allocated</div>
      </div>
      <div class="stat-item fail">
        <div class="stat-value">${stats.fail}</div>
        <div class="stat-label">Failed</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.rate}%</div>
        <div class="stat-label">Success</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${stats.utilization}%</div>
        <div class="stat-label">Mem Used</div>
      </div>
    `;
  }

  /**
   * Render progress description box.
   */
  appendLog(containerId, lines, type = 'info') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    // Parse the first line to extract process info
    const headerLine = lines[0] || '';
    const processMatch = headerLine.match(/Processing (\w+) \(Size: (\d+) KB\)/);

    if (processMatch) {
      // Header: process being allocated
      const header = document.createElement('div');
      header.className = 'desc-header';
      header.innerHTML = `
        <span class="desc-process-badge" style="background: ${type === 'success' ? 'var(--green)' : type === 'fail' ? 'var(--red)' : 'var(--cyan)'};">${processMatch[1]}</span>
        <span class="desc-size">${processMatch[2]} KB</span>
      `;
      container.appendChild(header);
    }

    // Strategy line (second line)
    if (lines[1]) {
      const strategy = document.createElement('div');
      strategy.className = 'desc-strategy';
      strategy.textContent = lines[1];
      container.appendChild(strategy);
    }

    // Steps: each block check
    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'desc-steps';

    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const step = document.createElement('div');

      if (line.includes('✓ Fits') || line.includes('✓ Candidate')) {
        step.className = 'desc-step step-pass';
        step.innerHTML = `<span class="step-icon">✓</span><span class="step-text">${line.replace(/✓\s*(Fits!?|Candidate)/, '').replace('—', '→').trim()}</span>`;
      } else if (line.includes('✗ Too small')) {
        step.className = 'desc-step step-reject';
        step.innerHTML = `<span class="step-icon">✗</span><span class="step-text">${line.replace('✗ Too small', '').replace('—', '→').trim()}</span>`;
      } else if (line.includes('✅')) {
        step.className = 'desc-step step-success';
        step.innerHTML = `<span class="step-icon">✅</span><span class="step-text">${line.replace('✅', '').trim()}</span>`;
      } else if (line.includes('❌')) {
        step.className = 'desc-step step-fail';
        step.innerHTML = `<span class="step-icon">❌</span><span class="step-text">${line.replace('❌', '').trim()}</span>`;
      } else if (line.includes('📌')) {
        step.className = 'desc-step step-pick';
        step.innerHTML = `<span class="step-icon">📌</span><span class="step-text">${line.replace('📌', '').trim()}</span>`;
      } else if (line.includes('remaining')) {
        step.className = 'desc-step step-info';
        step.innerHTML = `<span class="step-icon">💾</span><span class="step-text">${line.trim()}</span>`;
      } else {
        step.className = 'desc-step';
        step.innerHTML = `<span class="step-text">${line.trim()}</span>`;
      }

      stepsContainer.appendChild(step);
    }

    container.appendChild(stepsContainer);
    container.scrollTop = container.scrollHeight;
  }

  clearLog(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
  }

  /**
   * Animate the scanning of blocks during allocation.
   * Updates the description box in real-time as each block is scanned.
   * @param {string} containerId - rack container DOM id
   * @param {object} stepResult - result from engine step
   * @param {function} onAllocate - callback when block is allocated
   * @param {string} logContainerId - description box DOM id
   */
  async animateStep(containerId, stepResult, onAllocate, logContainerId) {
    const speed = this.animationSpeed;
    const logEl = logContainerId ? document.getElementById(logContainerId) : null;

    // Prepare the description box with header + strategy
    if (logEl) {
      logEl.innerHTML = '';
      logEl.classList.remove('state-scanning', 'state-success', 'state-fail');
      logEl.classList.add('state-scanning');

      // Header
      const header = document.createElement('div');
      header.className = 'desc-header';
      const badgeColor = stepResult.allocated ? 'var(--green)' : 'var(--red)';
      header.innerHTML = `
        <span class="desc-process-badge" style="background: var(--cyan);">${stepResult.processName}</span>
        <span class="desc-size">${stepResult.processSize} KB</span>
      `;
      logEl.appendChild(header);

      // Strategy line
      if (stepResult.log[1]) {
        const strategy = document.createElement('div');
        strategy.className = 'desc-strategy';
        strategy.textContent = stepResult.log[1];
        logEl.appendChild(strategy);
      }
    }

    // Steps container for real-time updates
    let stepsContainer = null;
    if (logEl) {
      stepsContainer = document.createElement('div');
      stepsContainer.className = 'desc-steps';
      logEl.appendChild(stepsContainer);
    }

    // If allocation failed, skip showing individual block scans in the log
    // Just run the visual animation then show final fail message
    const showLogSteps = stepResult.allocated;

    // Phase 1: Sequentially scan each checked block
    const isWorstFit = containerId.includes('worstfit');
    let maxFreeSize = -1;
    let maxIndicator = null;
    let currentBestRackEl = null;

    for (const check of stepResult.checkedBlocks) {
      const rackEl = document.getElementById(`${containerId}-rack-${check.blockId}`);
      if (!rackEl) continue;

      rackEl.classList.add('scanning');

      if (isWorstFit && check.fits && check.freeSize > maxFreeSize) {
        maxFreeSize = check.freeSize;
        if (currentBestRackEl) {
          currentBestRackEl.classList.remove('best-candidate');
          if (maxIndicator) maxIndicator.remove();
        }
        currentBestRackEl = rackEl;
        currentBestRackEl.classList.add('best-candidate');

        maxIndicator = document.createElement('div');
        maxIndicator.className = 'rack-pointer';
        maxIndicator.style.color = 'var(--magenta)';
        maxIndicator.style.whiteSpace = 'nowrap';
        maxIndicator.innerHTML = `▲ LARGEST (${check.freeSize} KB)`;
        currentBestRackEl.appendChild(maxIndicator);
      }

      // Real-time log entry for this block check
      if (stepsContainer && showLogSteps) {
        const step = document.createElement('div');
        if (check.fits) {
          step.className = 'desc-step step-pass';
          step.innerHTML = `<span class="step-icon">✓</span><span class="step-text">Checking Block ${check.blockId} (Free: ${check.freeSize} KB) → Fits</span>`;
        } else {
          step.className = 'desc-step step-reject';
          step.innerHTML = `<span class="step-icon">✗</span><span class="step-text">Checking Block ${check.blockId} (Free: ${check.freeSize} KB) → Too small</span>`;
        }
        stepsContainer.appendChild(step);
        logEl.scrollTop = logEl.scrollHeight;
      }

      await this.wait(speed * 0.6);

      rackEl.classList.remove('scanning');

      if (!check.fits) {
        rackEl.classList.add('scan-reject');
        await this.wait(speed * 0.3);
        rackEl.classList.remove('scan-reject');
      }
    }

    // Phase 2: Highlight the allocated block or show failure
    if (stepResult.allocated) {
      const targetEl = document.getElementById(`${containerId}-rack-${stepResult.targetBlockId}`);
      if (targetEl) {
        targetEl.classList.remove('scanning');
        targetEl.classList.add('allocated-flash');

        // Show worst fit pick in log
        if (stepsContainer && isWorstFit) {
          const pickStep = document.createElement('div');
          pickStep.className = 'desc-step step-pick';
          pickStep.innerHTML = `<span class="step-icon">📌</span><span class="step-text">Worst (largest) fit: Block ${stepResult.targetBlockId} (${maxFreeSize} KB free)</span>`;
          stepsContainer.appendChild(pickStep);
          logEl.scrollTop = logEl.scrollHeight;
        }

        // Let the yellow light stay lit for 0.5s first
        await this.wait(500);

        if (onAllocate) onAllocate();

        // Update log panel border and badge to success state immediately when allocated
        if (logEl) {
          logEl.classList.remove('state-scanning');
          logEl.classList.add('state-success');
          const badge = logEl.querySelector('.desc-process-badge');
          if (badge) badge.style.background = 'var(--success-color)';
        }

        const newTargetEl = document.getElementById(`${containerId}-rack-${stepResult.targetBlockId}`);
        if (newTargetEl) {
          newTargetEl.classList.add('allocated-flash');
        }

        // Show success in log
        if (stepsContainer) {
          const successStep = document.createElement('div');
          successStep.className = 'desc-step step-success';
          successStep.innerHTML = `<span class="step-icon">✅</span><span class="step-text">Allocated ${stepResult.processName} to Block ${stepResult.targetBlockId}</span>`;
          stepsContainer.appendChild(successStep);
          logEl.scrollTop = logEl.scrollHeight;
        }

        // Wait for the remaining duration of the animation phase
        await this.wait(Math.max(0, speed - 500));

        if (newTargetEl) {
          newTargetEl.classList.remove('allocated-flash');
        }
      }
    } else {
      // Show only the final failure message in the log
      if (stepsContainer) {
        const failStep = document.createElement('div');
        failStep.className = 'desc-step step-fail';
        failStep.innerHTML = `<span class="step-icon">❌</span><span class="step-text">Allocation FAILED — no block has enough free space for ${stepResult.processName} (${stepResult.processSize} KB)</span>`;
        stepsContainer.appendChild(failStep);
        logEl.scrollTop = logEl.scrollHeight;
      }

      // Update log panel and badge to fail state
      if (logEl) {
        logEl.classList.remove('state-scanning');
        logEl.classList.add('state-fail');
        const badge = logEl.querySelector('.desc-process-badge');
        if (badge) badge.style.background = 'var(--red)';
      }

      // Shake all blocks to indicate failure
      const racks = document.querySelectorAll(`#${containerId} .server-rack`);
      racks.forEach(r => r.classList.add('alloc-failed'));
      await this.wait(speed * 0.8);
      racks.forEach(r => r.classList.remove('alloc-failed'));
    }

    // Clean up any remaining scan classes
    const allRacks = document.querySelectorAll(`#${containerId} .server-rack`);
    allRacks.forEach(r => {
      r.classList.remove('scanning', 'scan-reject', 'allocated-flash', 'alloc-failed', 'best-candidate');
    });
  }

  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
