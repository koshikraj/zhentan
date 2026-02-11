import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const statePath = join(__dirname, 'state.json');

const arg = process.argv[2];

if (!arg || !['on', 'off'].includes(arg.toLowerCase())) {
  console.error('Usage: node toggle-screening.js <on|off>');
  process.exit(1);
}

try {
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  const newMode = arg.toLowerCase() === 'on';
  state.screeningMode = newMode;
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(JSON.stringify({
    status: 'ok',
    screeningMode: newMode,
    message: `Screening mode ${newMode ? 'ON' : 'OFF'}.`
  }));
} catch (err) {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
}
