/**
 * Style & Carry: API server.
 *
 * In production it also serves the built frontend from ../frontend/dist, so a
 * single `node server.js` puts the whole store online on one port.
 */
import app from './app.js';
import { read } from './db.js';
import { SESSION_SECONDS } from './middleware/auth.js';

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  const db = read();
  console.log(`\n  Style & Carry API  →  http://localhost:${PORT}`);
  console.log(`  ${db.products.length} products · ${db.orders.length} orders`);
  console.log(`  Admin session length: ${SESSION_SECONDS / 60} minutes`);
  if (db.users.length === 0) console.log('  No admin user yet — run: npm run seed');
  console.log('');
});
