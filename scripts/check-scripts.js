import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { execFileSync } from 'node:child_process';
for (const path of ['worker.js', 'lib/feedback.js', 'config.js', 'student-api.js', 'mobile.js', 'mobile-core.js', 'sw.js', 'teacher-demo.js', 'teacher-demo-core.js', 'supabase/functions/student-relay/relay.js']) execFileSync(process.execPath, ['--check', path]);
for (const path of ['index.html', 'teacher.html', 'teacher-demo.html']) {
  const html = readFileSync(path, 'utf8');
  for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    new Script(match[1], { filename: path });
  }
}
console.log('Worker, mobile/PWA modules and page scripts passed syntax checks.');
