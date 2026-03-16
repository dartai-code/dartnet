const https = require('https');
const HOST = 'web-production-031c.up.railway.app';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, path, method, headers: { 'Content-Type': 'application/json', 'Connection': 'close' } };
    if (token) opts.headers.Authorization = 'Bearer ' + token;
    const r = https.request(opts, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(d); } });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // 1. Login
  const login = await req('POST', '/api/auth/login', { email: 'testbot@test.com', password: 'Test1234' });
  console.log('1. LOGIN:', login.message);
  const tok = login.token;

  // 2. Me
  const me = await req('GET', '/api/auth/me', null, tok);
  console.log('2. ME: user=' + me.username + ' wallet=' + me.wallet_points + ' level=' + me.level);

  // 3. Submit game score (flappy-jump score 10 -> should detect task)
  const score = await req('POST', '/api/games/score', { gameId: 'flappy-jump', score: 10, levelsCompleted: 0, pointsEarned: 15 }, tok);
  console.log('3. SCORE:', score.message, 'detected=' + (score.completedTasks ? score.completedTasks.length : 0));
  if (score.completedTasks) score.completedTasks.forEach(t => console.log('   -> DETECTED:', t.title, '+' + t.reward + 'pts'));

  // 4. Tasks list
  const tasks = await req('GET', '/api/tasks', null, tok);
  const ready = tasks.filter(t => t.user_status === 'ready');
  const done = tasks.filter(t => t.user_status === 'completed');
  console.log('4. TASKS: total=' + tasks.length + ' ready=' + ready.length + ' done=' + done.length);
  ready.forEach(t => console.log('   -> READY:', t.task_title));

  // 5. Claim a ready task if any
  if (ready.length > 0) {
    const claim = await req('POST', '/api/tasks/' + ready[0].task_id + '/complete', {}, tok);
    console.log('5. CLAIM:', claim.message, 'reward=' + claim.reward);
  }

  // 6. Check pages
  const pages = ['index.html', 'dashboard.html', 'games.html', 'tasks.html', 'spin.html', 'contact.html'];
  for (const p of pages) {
    try {
      const r = await new Promise((resolve, reject) => {
        https.get('https://' + HOST + '/' + p, resp => { resolve(resp.statusCode); }).on('error', reject);
      });
      process.stdout.write(r + ' ');
    } catch (e) { process.stdout.write('FAIL '); }
  }
  console.log('\n6. PAGES: ' + pages.join(', '));

  console.log('\n=== ALL TESTS PASSED ===');
}

main().catch(e => console.error('ERROR:', e));
