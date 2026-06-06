const os = require('os');
const fs = require('fs');

/**
 * Checks if the application is running inside a Docker container.
 * @returns {boolean}
 */
function isRunningInDocker() {
  // Check 1: Existence of /.dockerenv file
  try {
    if (fs.existsSync('/.dockerenv')) {
      return true;
    }
  } catch (_) {
    // Ignore error
  }

  // Check 2: Check /proc/1/cgroup contents
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    if (cgroup.includes('docker') || cgroup.includes('kubepods') || cgroup.includes('overlay')) {
      return true;
    }
  } catch (_) {
    // Ignore error
  }

  return false;
}

/**
 * Returns system information and metrics.
 * @returns {object}
 */
function getSystemMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown CPU';
  const cpuCount = cpus.length;

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    type: os.type(),
    release: os.release(),
    uptime: os.uptime(),
    loadAverage: os.loadavg(),
    memory: {
      totalGB: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
      freeGB: (freeMem / (1024 * 1024 * 1024)).toFixed(2),
      usedGB: (usedMem / (1024 * 1024 * 1024)).toFixed(2),
      usagePercent: memUsagePercent
    },
    cpu: {
      model: cpuModel,
      cores: cpuCount
    },
    isDocker: isRunningInDocker(),
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  isRunningInDocker,
  getSystemMetrics
};
