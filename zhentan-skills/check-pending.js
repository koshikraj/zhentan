import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

try {
  const state = JSON.parse(readFileSync(join(__dirname, 'state.json'), 'utf8'));

  if (!state.screeningMode) {
    console.log(JSON.stringify({ status: 'screening_off', message: 'Screening mode is OFF. Skipping check.' }));
    process.exit(0);
  }

  const queue = JSON.parse(readFileSync(join(__dirname, 'pending-queue.json'), 'utf8'));
  const pending = queue.pending.filter(tx => !tx.executedAt && !tx.inReview && !tx.rejected);

  if (pending.length === 0) {
    console.log(JSON.stringify({ status: 'empty', message: 'No pending transactions.' }));
  } else {
    console.log(JSON.stringify({
      status: 'has_pending',
      count: pending.length,
      transactions: pending
    }, null, 2));
  }
} catch (err) {
  console.error(JSON.stringify({ status: 'error', message: err.message }));
  process.exit(1);
}
