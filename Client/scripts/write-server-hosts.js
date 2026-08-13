#!/usr/bin/env node

/*
 * Writes the current non-virtual IPv4 LAN addresses into a tiny source module.
 * Set SERVER_HOST when a VPN/multi-NIC machine needs an explicit preferred IP:
 *   SERVER_HOST=192.168.1.42 npm start
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const outputFile = path.join(__dirname, '..', 'src', 'generatedServerHosts.js');
const ignoredInterfaces = /^(lo|docker|br-|veth|virbr|zt|tun|tap|wg)/i;

let interfaces = {};
try {
  interfaces = os.networkInterfaces();
} catch (error) {
  // Some restricted build containers disallow interface enumeration. This must
  // not stop Metro; a real developer host will normally provide the addresses.
  console.warn(`Could not enumerate LAN interfaces: ${error.message}`);
}

const interfaceAddresses = Object.entries(interfaces)
  .filter(([name]) => !ignoredInterfaces.test(name))
  .flatMap(([, entries]) => entries || [])
  .filter(entry => entry.family === 'IPv4' && !entry.internal && !entry.address.startsWith('169.254.'))
  .map(entry => entry.address);

// `os.networkInterfaces()` can be unavailable in restricted Node runtimes.
// Fall back to the OS route table so a physical phone can still receive the
// computer's current Wi-Fi/LAN address.
let routeAddresses = [];
try {
  const routeOutput = childProcess.execFileSync('sh', ['-c', 'hostname -I 2>/dev/null || true'], {
    encoding: 'utf8',
  });
  routeAddresses = routeOutput.trim().split(/\s+/).filter(Boolean);
} catch (error) {}

if (!routeAddresses.length) {
  try {
    const routeOutput = childProcess.execFileSync(
      'sh',
      ['-c', "ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.*src \\([0-9.]*\\).*/\\1/p'"],
      { encoding: 'utf8' },
    );
    routeAddresses = routeOutput.trim().split(/\s+/).filter(Boolean);
  } catch (error) {}
}

const addresses = [...new Set([...interfaceAddresses, ...routeAddresses])]
  .filter(address => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(address))
  .filter(address => !address.startsWith('127.') && !address.startsWith('169.254.'));

const preferred = (process.env.SERVER_HOST || '').trim();
const hosts = [...new Set([preferred, ...addresses].filter(Boolean))];
const content = `// Generated at startup. Do not edit manually.\nexport const SERVER_HOSTS = ${JSON.stringify(hosts)};\n`;

fs.writeFileSync(outputFile, content, 'utf8');
console.log(`API host candidates: ${hosts.length ? hosts.join(', ') : 'none found'}`);
