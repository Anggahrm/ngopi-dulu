// auth.js — Supabase Auth
async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  await handleSession(session);
  sb.auth.onAuthStateChange(async (_e, session) => { await handleSession(session); });
}

async function handleSession(session) {
  if (session?.user) {
    APP.user = session.user;
    APP.profile = await fetchProfile(session.user.id);
    renderAuthState('logged-in');
  } else {
    APP.user = null; APP.profile = null;
    renderAuthState('guest');
  }
  if (typeof render === 'function') render();
}

async function fetchProfile(userId) {
  const { data } = await sb.from('profiles').select('id, username, full_name, avatar_url, role').eq('id', userId).single();
  return data;
}

function renderAuthState(state) {
  const ga = document.getElementById('guestActions');
  const ua = document.getElementById('userActions');
  const av = document.getElementById('userAvatar');
  const un = document.getElementById('userDisplayName');
  const ab = document.getElementById('adminBtn');

  if (state === 'logged-in' && APP.profile) {
    ga.style.display = 'none'; ua.style.display = 'flex';
    av.textContent = (APP.profile.full_name || APP.profile.username || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2);
    un.textContent = APP.profile.username;
    ab.style.display = APP.profile.role === 'admin' ? 'block' : 'none';
  } else {
    ga.style.display = 'flex'; ua.style.display = 'none';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const btn = document.getElementById('registerBtn2');
  const errEl = document.getElementById('registerError');
  errEl.style.display = 'none';
  const fullName = document.getElementById('regFullName').value.trim();
  const username = document.getElementById('regUsername').value.trim().toLowerCase();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!fullName || !username || !email || !password) return showAuthError('registerError', 'Semua field wajib diisi.');
  if (!/^[a-z0-9_]+$/.test(username)) return showAuthError('registerError', 'Username hanya huruf kecil, angka, underscore.');
  if (password.length < 8) return showAuthError('registerError', 'Password minimal 8 karakter.');
  btn.disabled = true; btn.textContent = 'Membuat akun...';
  const res = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName, username } } });
  btn.disabled = false; btn.textContent = 'Buat Akun';
  if (res.error) return showAuthError('registerError', res.error.message);
  closeModal(document.getElementById('authModal'));
  showToast('Akun berhasil dibuat! ☕', 'success');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn2');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showAuthError('loginError', 'Email dan password wajib diisi.');
  btn.disabled = true; btn.textContent = 'Masuk...';
  const res = await sb.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Masuk';
  if (res.error) return showAuthError('loginError', 'Email atau password salah.');
  closeModal(document.getElementById('authModal'));
  showToast('Selamat datang kembali! ☕', 'success');
}

async function handleLogout() { await sb.auth.signOut(); showToast('Kamu telah keluar.', 'info'); }

function showAuthError(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg; el.style.display = 'block';
  if (!reduced()) anime({ targets: el, translateX: [0,-5,5,-3,3,0], duration: 300, easing: 'easeInOutQuad' });
}

function openAuthModal(tab) {
  tab = tab || 'login';
  document.getElementById('loginForm').reset(); document.getElementById('registerForm').reset();
  document.getElementById('loginError').style.display = 'none'; document.getElementById('registerError').style.display = 'none';
  document.querySelectorAll('.modal-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authTitle').textContent = tab === 'login' ? 'Masuk' : 'Buat Akun';
  openModal(document.getElementById('authModal'));
}

function bindAuthEvents() {
  document.getElementById('loginBtn').addEventListener('click', () => openAuthModal('login'));
  document.getElementById('registerBtn').addEventListener('click', () => openAuthModal('register'));
  document.getElementById('closeAuth').addEventListener('click', () => closeModal(document.getElementById('authModal')));
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      document.getElementById('loginForm').style.display = isLogin ? 'block' : 'none';
      document.getElementById('registerForm').style.display = isLogin ? 'none' : 'block';
      document.getElementById('authTitle').textContent = isLogin ? 'Masuk' : 'Buat Akun';
    });
  });
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  document.getElementById('userChip').addEventListener('click', e => { e.stopPropagation(); document.getElementById('userChip').classList.toggle('open'); });
  document.addEventListener('click', () => document.getElementById('userChip')?.classList.remove('open'));
  document.getElementById('adminBtn').addEventListener('click', () => { document.getElementById('userChip').classList.remove('open'); openAdminPanel(); });
}
