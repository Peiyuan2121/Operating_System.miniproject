/**
 * Memory Allocation Engine
 * Implements Next Fit & Worst Fit algorithms with step-by-step execution.
 */

export class Process {
  constructor(name, size, color) {
    this.name = name;
    this.size = size;
    this.color = color;
  }
}

export class Block {
  constructor(id, size) {
    this.id = id;
    this.size = size;
    this.originalSize = size;
    this.allocations = []; // { processName, size, color }
  }

  get usedSize() {
    return this.allocations.reduce((sum, a) => sum + a.size, 0);
  }

  get freeSize() {
    return this.size - this.usedSize;
  }

  clone() {
    const b = new Block(this.id, this.size);
    b.originalSize = this.originalSize;
    b.allocations = this.allocations.map(a => ({ ...a }));
    return b;
  }
}

export class StepResult {
  constructor() {
    this.processName = '';
    this.processSize = 0;
    this.processColor = '';
    this.allocated = false;
    this.targetBlockId = -1;
    this.checkedBlocks = []; // { blockId, fits: bool }
    this.scanStartIndex = 0;
    this.log = [];
  }
}

export class MemoryManager {
  constructor(blocks) {
    this.originalBlocks = blocks.map(b => b.clone());
    this.blocks = blocks.map(b => b.clone());
    this.nextPointer = 0;
    this.records = [];
    this.processQueue = [];
    this.currentProcessIndex = 0;
  }

  reset() {
    this.blocks = this.originalBlocks.map(b => b.clone());
    this.nextPointer = 0;
    this.records = [];
    this.currentProcessIndex = 0;
  }

  setProcesses(processes) {
    this.processQueue = processes;
    this.currentProcessIndex = 0;
  }

  isComplete() {
    return this.currentProcessIndex >= this.processQueue.length;
  }

  getStats() {
    const total = this.records.length;
    const success = this.records.filter(r => r.allocated).length;
    const fail = total - success;
    const rate = total > 0 ? ((success / total) * 100).toFixed(1) : '0.0';
    const totalMemory = this.blocks.reduce((s, b) => s + b.originalSize, 0);
    const usedMemory = this.blocks.reduce((s, b) => s + b.usedSize, 0);
    const utilization = totalMemory > 0 ? ((usedMemory / totalMemory) * 100).toFixed(1) : '0.0';
    return { total, success, fail, rate, totalMemory, usedMemory, utilization };
  }

  /**
   * Execute one step of Next Fit allocation.
   * Returns a StepResult with full details for animation.
   */
  nextFitStep() {
    if (this.isComplete()) return null;

    const p = this.processQueue[this.currentProcessIndex];
    const result = new StepResult();
    result.processName = p.name;
    result.processSize = p.size;
    result.processColor = p.color;
    result.scanStartIndex = this.nextPointer;
    result.log.push(`Processing ${p.name} (Size: ${p.size} KB)`);
    result.log.push(`Starting scan from Block ${this.blocks[this.nextPointer].id}`);

    let count = 0;
    let allocated = false;

    while (count < this.blocks.length) {
      const b = this.blocks[this.nextPointer];
      const fits = b.freeSize >= p.size;
      result.checkedBlocks.push({ blockId: b.id, blockIndex: this.nextPointer, fits, freeSize: b.freeSize });
      result.log.push(`  Checking Block ${b.id} (Free: ${b.freeSize} KB) — ${fits ? '✓ Fits!' : '✗ Too small'}`);

      if (fits) {
        b.allocations.push({ processName: p.name, size: p.size, color: p.color });
        allocated = true;
        result.allocated = true;
        result.targetBlockId = b.id;
        result.log.push(`  ✅ Allocated ${p.name} to Block ${b.id}`);
        result.log.push(`  Block ${b.id} remaining: ${b.freeSize} KB`);
        this.records.push({ processName: p.name, processSize: p.size, blockId: b.id, allocated: true });
        this.nextPointer = (this.nextPointer + 1) % this.blocks.length;
        break;
      }

      this.nextPointer = (this.nextPointer + 1) % this.blocks.length;
      count++;
    }

    if (!allocated) {
      result.log.push(`  ❌ Allocation FAILED — no block large enough`);
      this.records.push({ processName: p.name, processSize: p.size, blockId: -1, allocated: false });
    }

    this.currentProcessIndex++;
    return result;
  }

  /**
   * Execute one step of Worst Fit allocation.
   * Returns a StepResult with full details for animation.
   */
  worstFitStep() {
    if (this.isComplete()) return null;

    const p = this.processQueue[this.currentProcessIndex];
    const result = new StepResult();
    result.processName = p.name;
    result.processSize = p.size;
    result.processColor = p.color;
    result.log.push(`Processing ${p.name} (Size: ${p.size} KB)`);
    result.log.push(`Scanning ALL blocks for largest fit...`);

    let worstIndex = -1;
    let worstFree = -1;

    for (let j = 0; j < this.blocks.length; j++) {
      const b = this.blocks[j];
      const fits = b.freeSize >= p.size;
      result.checkedBlocks.push({ blockId: b.id, blockIndex: j, fits, freeSize: b.freeSize });
      result.log.push(`  Checking Block ${b.id} (Free: ${b.freeSize} KB) — ${fits ? '✓ Candidate' : '✗ Too small'}`);

      if (fits && b.freeSize > worstFree) {
        worstIndex = j;
        worstFree = b.freeSize;
      }
    }

    if (worstIndex !== -1) {
      const b = this.blocks[worstIndex];
      b.allocations.push({ processName: p.name, size: p.size, color: p.color });
      result.allocated = true;
      result.targetBlockId = b.id;
      result.log.push(`  📌 Worst (largest) fit: Block ${b.id} (was ${worstFree} KB free)`);
      result.log.push(`  ✅ Allocated ${p.name} to Block ${b.id}`);
      result.log.push(`  Block ${b.id} remaining: ${b.freeSize} KB`);
      this.records.push({ processName: p.name, processSize: p.size, blockId: b.id, allocated: true });
    } else {
      result.log.push(`  ❌ Allocation FAILED — no block large enough`);
      this.records.push({ processName: p.name, processSize: p.size, blockId: -1, allocated: false });
    }

    this.currentProcessIndex++;
    return result;
  }
}

/** Default scenario matching the C++ code */
export function createDefaultScenario() {
  const blocks = [
    new Block(1, 100),
    new Block(2, 500),
    new Block(3, 200),
    new Block(4, 300),
    new Block(5, 600),
  ];

  const processColors = [
    'hsla(15, 95%, 60%, 0.85)',
    'hsla(350, 85%, 65%, 0.85)',
    'hsla(45, 95%, 60%, 0.85)',
    'hsla(30, 85%, 60%, 0.85)',
    'hsla(0, 80%, 60%, 0.85)',
    'hsla(55, 95%, 60%, 0.85)',
  ];

  const processes = [
    new Process('P1', 212, processColors[0]),
    new Process('P2', 417, processColors[1]),
    new Process('P3', 112, processColors[2]),
    new Process('P4', 426, processColors[3]),
  ];

  return { blocks, processes, processColors };
}
