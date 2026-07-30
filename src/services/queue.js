import { runQuery, getAll, getOne } from './database.js';

export function isQueueOpen() {
  const row = getOne('SELECT value FROM queue_settings WHERE key = ?', ['queue_open']);
  return row?.value === 'true';
}

export function setQueueOpen(open) {
  runQuery('INSERT OR REPLACE INTO queue_settings (key, value) VALUES (?, ?)', ['queue_open', open.toString()]);
}

export function addActiveTester(testerId) {
  runQuery('INSERT OR IGNORE INTO active_testers (tester_id) VALUES (?)', [testerId]);
}

export function removeActiveTester(testerId) {
  runQuery('DELETE FROM active_testers WHERE tester_id = ?', [testerId]);
}

export function getAllActiveTesters() {
  return getAll('SELECT tester_id FROM active_testers');
}

export function addToQueue(userId, username, region = 'SA') {
  const testing = getOne('SELECT id FROM active_tests WHERE user_id = ?', [userId]);
  if (testing) return { success: false, error: 'Voce ja esta sendo testado!' };

  const existing = getOne('SELECT id FROM queue WHERE user_id = ? AND status = ?', [userId, 'waiting']);
  if (existing) return { success: false, error: 'Voce ja esta na fila!' };

  const lastTest = getOne('SELECT last_tested_at FROM queue WHERE user_id = ? AND last_tested_at IS NOT NULL ORDER BY last_tested_at DESC LIMIT 1', [userId]);
  if (lastTest && lastTest.last_tested_at) {
    const lastTested = new Date(lastTest.last_tested_at);
    const cooldownMs = 10 * 24 * 60 * 60 * 1000;
    const agora = new Date();
    const diff = agora - lastTested;
    if (diff < cooldownMs) {
      const expira = new Date(lastTested.getTime() + cooldownMs);
      const dias = Math.ceil((cooldownMs - diff) / (1000 * 60 * 60 * 24));
      return { success: false, error: 'Cooldown ativo! Voce so podera testar em ' + dias + ' dia(s) (expira em ' + expira.toLocaleString('pt-BR') + ').' };
    }
  }

  const countRow = getOne('SELECT COUNT(*) as total FROM queue WHERE status = ?', ['waiting']);
  if (countRow && countRow.total >= 5) {
    return { success: false, error: 'A fila esta cheia (5/5). Aguarde uma vaga abrir.' };
  }

  const maxPos = getOne('SELECT MAX(position) as max_pos FROM queue WHERE status = ?', ['waiting']);
  const position = (maxPos?.max_pos || 0) + 1;

  runQuery('INSERT INTO queue (user_id, username, position, status, region) VALUES (?, ?, ?, ?, ?)', [userId, username, position, 'waiting', region]);

  return { success: true, position };
}

export function removeFromQueue(userId) {
  runQuery('DELETE FROM queue WHERE user_id = ? AND status = ?', [userId, 'waiting']);
  repositionQueue();
}

function repositionQueue() {
  const waiting = getAll('SELECT id FROM queue WHERE status = ? ORDER BY registered_at ASC', ['waiting']);
  waiting.forEach((row, index) => {
    runQuery('UPDATE queue SET position = ? WHERE id = ?', [index + 1, row.id]);
  });
}

export function getNext(testerId) {
  const next = getOne('SELECT * FROM queue WHERE status = ? ORDER BY position ASC LIMIT 1', ['waiting']);
  if (!next) return null;

  const currentTest = getCurrentTest();
  if (currentTest) return { error: 'Ja ha um teste em andamento! Use /fila skipar ou /fila finalizar primeiro.' };

  runQuery('UPDATE queue SET status = ? WHERE id = ?', ['testing', next.id]);
  runQuery('INSERT INTO active_tests (user_id, tester_id) VALUES (?, ?)', [next.user_id, testerId || 'system']);

  repositionQueue();
  return next;
}

export function getCurrentTest() {
  const results = getAll(`
    SELECT at.id, at.user_id, at.tester_id, at.started_at, q.username, q.position, q.region
    FROM active_tests at
    JOIN queue q ON at.user_id = q.user_id
    LIMIT 1
  `);
  return results[0] || null;
}

export function getCurrentTestRaw() {
  return getOne('SELECT * FROM active_tests LIMIT 1');
}

export function finishTest(tier, testerId) {
  const current = getCurrentTest();
  if (!current) return { error: 'Nao ha teste em andamento!' };

  const raw = getCurrentTestRaw();
  runQuery('UPDATE queue SET status = ?, tier = ?, tested_at = datetime("now") WHERE user_id = ? AND status = ?',
    ['completed', tier, current.user_id, 'testing']);

  runQuery('DELETE FROM active_tests WHERE id = ?', [raw.id]);

  return {
    success: true,
    userId: current.user_id,
    username: current.username,
    region: current.region,
    testerId: raw.tester_id || testerId,
    tier
  };
}

export function setLastTested(userId) {
  runQuery('UPDATE queue SET last_tested_at = datetime("now") WHERE user_id = ?', [userId]);
}

export function removeCooldown(userId) {
  runQuery('UPDATE queue SET last_tested_at = NULL WHERE user_id = ?', [userId]);
}

export function skipTest() {
  const current = getCurrentTestRaw();
  if (!current) return { error: 'Nao ha teste em andamento!' };

  runQuery('DELETE FROM active_tests WHERE id = ?', [current.id]);
  runQuery('DELETE FROM queue WHERE user_id = ? AND status = ?', [current.user_id, 'testing']);

  repositionQueue();
  return { success: true, userId: current.user_id };
}

export function getQueueList() {
  return getAll('SELECT * FROM queue WHERE status = ? ORDER BY position ASC', ['waiting']);
}

export function isInQueue(userId) {
  const row = getOne('SELECT id FROM queue WHERE user_id = ? AND status IN (?, ?)', [userId, 'waiting', 'testing']);
  return !!row;
}

export function getPosition(userId) {
  const row = getOne('SELECT position FROM queue WHERE user_id = ? AND status = ?', [userId, 'waiting']);
  return row?.position;
}

export function forcePosition(userId, newPosition) {
  const user = getOne('SELECT id, position FROM queue WHERE user_id = ? AND status = ?', [userId, 'waiting']);
  if (!user) return { error: 'Usuario nao encontrado na fila!' };

  const maxPos = getOne('SELECT MAX(position) as max_pos FROM queue WHERE status = ?', ['waiting']);
  if (newPosition < 1 || newPosition > (maxPos?.max_pos || 1)) {
    return { error: 'Posicao invalida!' };
  }

  runQuery('UPDATE queue SET position = ? WHERE id = ?', [newPosition, user.id]);
  repositionQueue();

  return { success: true, newPosition };
}

export function clearCompleted() {
  runQuery('DELETE FROM queue WHERE status = ?', ['completed']);
}
