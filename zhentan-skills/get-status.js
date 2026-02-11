import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const state = JSON.parse(readFileSync(join(__dirname, 'state.json'), 'utf8'));
  const patterns = JSON.parse(readFileSync(join(__dirname, 'patterns.json'), 'utf8'));

  const recentDecisions = state.decisions.slice(-10);
  const knownRecipients = Object.keys(patterns.recipients).length;

  console.log(JSON.stringify({
    screeningMode: state.screeningMode,
    lastCheck: state.lastCheck,
    knownRecipients,
    globalLimits: patterns.globalLimits,
    recentDecisions
  }, null, 2));
} catch (err) {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
}
