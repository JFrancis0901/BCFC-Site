/* ==========================================================
   api/resources.js  (Vercel serverless function)

   Lets a signed-in ADMIN add / remove files on the Resources page.
   It saves straight to GitHub (one commit), and Vercel then redeploys.

   Security:
   - The GitHub token lives ONLY in Vercel's environment variables (GITHUB_TOKEN).
     It is never sent to the browser and never stored in the repo.
   - Every request must carry the admin's Firebase login token. The function checks
     it with Google, then reads the user's role from Firestore. Only an approved
     "admin" is allowed. Everyone else gets 403.
   ========================================================== */

const API_KEY    = 'AIzaSyA6YuHWmOaPEwrMRLCmvMHENoB-ysKeRg8';   // public web key (same as firebase-config.js)
const PROJECT_ID = 'bcfc-workers';
const REPO       = process.env.GITHUB_REPO   || 'JFrancis0901/BCFC-Site';
const BRANCH     = process.env.GITHUB_BRANCH || 'main';
const DIR        = 'workers/Files';
const MANIFEST   = DIR + '/resources.json';

const MAX_BYTES  = 3 * 1000 * 1000;   // Vercel limits a request to ~4.5 MB; base64 adds ~33%
const ALLOWED_EXT = ['pdf','doc','docx','ppt','pptx','xls','xlsx','csv','txt','png','jpg','jpeg','mp3'];
const ALLOWED_FOR = ['all','childrens','ufy','ufw','ufm','production','creatives','pastor','preaching'];

class HttpError extends Error { constructor(status, message){ super(message); this.status = status; } }

async function verifyAdmin(idToken){
  const lk = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken })
  });
  if (!lk.ok) throw new HttpError(401, 'Your login has expired. Please log in again.');
  const uid = (await lk.json()).users?.[0]?.localId;
  if (!uid) throw new HttpError(401, 'Could not verify your login.');

  const fs = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (!fs.ok) throw new HttpError(403, 'Could not check your role.');
  const f = (await fs.json()).fields || {};
  const role = f.role?.stringValue || '';
  const status = f.roleStatus?.stringValue;               // missing = approved (matches your Firestore rules)
  if (role !== 'admin' || (status !== undefined && status !== 'approved')) throw new HttpError(403, 'Only an administrator can manage resources.');
  return uid;
}

async function gh(path, options = {}){
  if (!process.env.GITHUB_TOKEN) throw new HttpError(500, 'GITHUB_TOKEN is not set in Vercel. See RESOURCES_SETUP.txt.');
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'bcfc-resources',
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (r.status === 404 && options.allow404) return null;
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    console.error('GitHub error', r.status, path, t);
    if (r.status === 401 || r.status === 403) throw new HttpError(500, 'GitHub refused the request. Check that GITHUB_TOKEN is valid and has Contents: Read and write on this repository.');
    throw new HttpError(500, `GitHub error (${r.status}).`);
  }
  return r.json();
}

const fmtSize = b => b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1000)) + ' KB';

function cleanName(raw){
  let n = String(raw || '').split(/[\\/]/).pop().trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9._-]/g, '');
  n = n.replace(/^\.+/, '').replace(/\.{2,}/g, '.');
  const ext = (n.split('.').pop() || '').toLowerCase();
  if (!n || n.length > 80 || !n.includes('.') || !ALLOWED_EXT.includes(ext)) {
    throw new HttpError(400, `That file type is not allowed. Allowed: ${ALLOWED_EXT.join(', ')}.`);
  }
  return n;
}

async function readManifest(ref){
  const r = await gh(`/contents/${MANIFEST}?ref=${encodeURIComponent(ref)}`, { allow404: true });
  if (!r) return [];
  try { const arr = JSON.parse(Buffer.from(r.content, 'base64').toString('utf8')); return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

// One commit containing every change (so Vercel only redeploys once).
async function commit(message, treeEntries){
  const ref = await gh(`/git/ref/heads/${BRANCH}`);
  const head = ref.object.sha;
  const headCommit = await gh(`/git/commits/${head}`);
  const tree = await gh('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: headCommit.tree.sha, tree: treeEntries }) });
  const c = await gh('/git/commits', { method: 'POST', body: JSON.stringify({ message, tree: tree.sha, parents: [head] }) });
  await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: c.sha }) });
  return c.sha;
}

async function addResource(body){
  const title = String(body.title || '').trim().slice(0, 80);
  if (!title) throw new HttpError(400, 'Please enter a title.');
  const description = String(body.description || '').trim().slice(0, 200);
  const category = String(body.category || '').trim().slice(0, 40) || 'General';
  let forRoles = (Array.isArray(body.for) ? body.for : ['all']).filter(x => ALLOWED_FOR.includes(x));
  if (!forRoles.length || forRoles.includes('all')) forRoles = ['all'];

  const name = cleanName(body.fileName);
  if (name.toLowerCase() === 'resources.json') throw new HttpError(400, 'That file name is reserved.');
  const b64 = String(body.content || '').replace(/^data:[^,]*,/, '').replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) throw new HttpError(400, 'The file could not be read.');
  const bytes = Buffer.from(b64, 'base64').length;
  if (!bytes) throw new HttpError(400, 'The file is empty.');
  if (bytes > MAX_BYTES) throw new HttpError(413, 'That file is too large (limit 3 MB). Upload bigger files directly on GitHub.');

  const head = (await gh(`/git/ref/heads/${BRANCH}`)).object.sha;
  const list = await readManifest(head);
  const path = `${DIR}/${name}`;
  if (list.some(x => x.file === `Files/${name}`) || await gh(`/contents/${path}?ref=${encodeURIComponent(head)}`, { allow404: true })) {
    throw new HttpError(409, 'A file with that name already exists. Rename the file and try again.');
  }

  const entry = { title, description, file: `Files/${name}`, category, size: fmtSize(bytes), for: forRoles };
  list.push(entry);
  const fileBlob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: b64, encoding: 'base64' }) });
  const manBlob  = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: JSON.stringify(list, null, 2) + '\n', encoding: 'utf-8' }) });
  await commit(`Add resource: ${title}`, [
    { path, mode: '100644', type: 'blob', sha: fileBlob.sha },
    { path: MANIFEST, mode: '100644', type: 'blob', sha: manBlob.sha }
  ]);
  return entry;
}

async function removeResource(body){
  const file = String(body.file || '');
  if (!/^Files\/[A-Za-z0-9._-]+$/.test(file)) throw new HttpError(400, 'Invalid file.');
  const head = (await gh(`/git/ref/heads/${BRANCH}`)).object.sha;
  const list = await readManifest(head);
  const item = list.find(x => x.file === file);
  if (!item) throw new HttpError(404, 'That resource was not found.');
  const rest = list.filter(x => x.file !== file);
  const manBlob = await gh('/git/blobs', { method: 'POST', body: JSON.stringify({ content: JSON.stringify(rest, null, 2) + '\n', encoding: 'utf-8' }) });
  await commit(`Remove resource: ${item.title}`, [
    { path: MANIFEST, mode: '100644', type: 'blob', sha: manBlob.sha },
    { path: `workers/${file}`, mode: '100644', type: 'blob', sha: null }
  ]);
  return { removed: file };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Use POST.');
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
    if (!m) throw new HttpError(401, 'Please log in again.');
    await verifyAdmin(m[1]);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const result = body.action === 'delete' ? await removeResource(body) : await addResource(body);
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    const status = e.status || 500;
    if (!e.status) console.error(e);
    res.status(status).json({ ok: false, error: e.status ? e.message : 'Something went wrong. Please try again.' });
  }
};
