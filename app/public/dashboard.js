// State variables
let currentUptime = 0;
let uptimeTimer = null;

// DOM Elements
const containerStatus = document.getElementById('container-status');
const refreshBtn = document.getElementById('refresh-btn');

// Meta elements
const metaEnv = document.getElementById('meta-env');
const metaVersion = document.getElementById('meta-version');
const metaDeployedBy = document.getElementById('meta-deployed-by');
const metaOS = document.getElementById('meta-os');

// Memory metrics
const memProgress = document.getElementById('mem-progress');
const memPercent = document.getElementById('mem-percent');
const memTotal = document.getElementById('mem-total');
const memUsed = document.getElementById('mem-used');
const memFree = document.getElementById('mem-free');

// System specs
const hostName = document.getElementById('host-name');
const hostRelease = document.getElementById('host-release');
const hostCpu = document.getElementById('host-cpu');
const hostCores = document.getElementById('host-cores');

// Load & Activity metrics
const load1 = document.getElementById('load-1');
const load5 = document.getElementById('load-5');
const load15 = document.getElementById('load-15');
const uptimeDisplay = document.getElementById('uptime-display');

// Helper to format uptime duration
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}

// Update the local uptime counter
function startLocalUptimeCounter(initialSeconds) {
  currentUptime = initialSeconds;
  if (uptimeTimer) {
    clearInterval(uptimeTimer);
  }
  uptimeDisplay.textContent = formatDuration(currentUptime);
  uptimeTimer = setInterval(() => {
    currentUptime++;
    uptimeDisplay.textContent = formatDuration(currentUptime);
  }, 1000);
}

// Fetch and sync metrics
async function fetchMetrics() {
  refreshBtn.classList.add('syncing');
  try {
    const response = await fetch('/api/metrics');
    if (!response.ok) throw new Error('API server returned error status');
    
    const data = await response.json();
    updateUI(data);
  } catch (error) {
    console.error('Failed to retrieve system metrics:', error);
    // Set status badge to Offline
    containerStatus.className = 'status-badge local';
    containerStatus.innerHTML = `
      <span class="status-dot" style="background-color: hsl(0, 76%, 50%)"></span>
      <span>Connection Error</span>
    `;
  } finally {
    // Add brief artificial delay for smooth transition feel
    setTimeout(() => {
      refreshBtn.classList.remove('syncing');
    }, 450);
  }
}

// Update UI elements from payload data
function updateUI(data) {
  // Update environment/Docker status badge
  if (data.isDocker) {
    containerStatus.className = 'status-badge';
    containerStatus.style.background = 'hsla(197, 92%, 50%, 0.1)';
    containerStatus.style.borderColor = 'hsla(197, 92%, 50%, 0.2)';
    containerStatus.style.color = 'var(--docker-color)';
    containerStatus.innerHTML = `
      <span class="status-dot"></span>
      <span>Containerized (Docker)</span>
    `;
  } else {
    containerStatus.className = 'status-badge local';
    containerStatus.style.background = 'hsla(36, 100%, 50%, 0.08)';
    containerStatus.style.borderColor = 'hsla(36, 100%, 50%, 0.2)';
    containerStatus.style.color = 'var(--aws-color)';
    containerStatus.innerHTML = `
      <span class="status-dot"></span>
      <span>Bare Metal / VM Host</span>
    `;
  }

  // Update deployment meta
  metaEnv.textContent = (data.app.environment || 'production').toUpperCase();
  metaVersion.textContent = `v${data.app.version}`;
  metaDeployedBy.textContent = data.app.deployedBy;
  metaOS.textContent = `${data.type} (${data.platform})`;

  // Memory Metrics
  const memUsagePercent = parseFloat(data.memory.usagePercent);
  memPercent.textContent = `${memUsagePercent.toFixed(0)}%`;
  // Set stroke-dasharray. Max circumference of SVG circle with radius 15.9155 is ~100
  memProgress.setAttribute('stroke-dasharray', `${memUsagePercent}, 100`);
  
  // Custom color gradient for memory progress based on usage
  if (memUsagePercent > 85) {
    memProgress.style.stroke = 'hsl(354, 70%, 50%)'; // Alert red
  } else if (memUsagePercent > 70) {
    memProgress.style.stroke = 'var(--aws-color)'; // Warning orange
  } else {
    memProgress.style.stroke = 'var(--secondary-accent)'; // Tech cyan
  }

  memTotal.textContent = `${data.memory.totalGB} GB`;
  memUsed.textContent = `${data.memory.usedGB} GB`;
  memFree.textContent = `${data.memory.freeGB} GB`;

  // System details
  hostName.textContent = data.hostname;
  hostRelease.textContent = data.release;
  hostCpu.textContent = data.cpu.model;
  hostCores.textContent = `${data.cpu.cores} Core(s)`;

  // Performance Load Avg
  load1.textContent = data.loadAverage[0].toFixed(2);
  load5.textContent = data.loadAverage[1].toFixed(2);
  load15.textContent = data.loadAverage[2].toFixed(2);

  // Sync Uptime Counter
  startLocalUptimeCounter(data.uptime);
}

// Initial Sync and Poll Setup
document.addEventListener('DOMContentLoaded', () => {
  fetchMetrics();
  // Poll metrics every 6 seconds
  setInterval(fetchMetrics, 6000);
});

// Event listener for manual refresh click
refreshBtn.addEventListener('click', fetchMetrics);
