// admin.js
function openAdminPanel() { if (APP.profile?.role !== 'admin') return; document.getElementById('adminPanel').classList.add('open'); loadOrders(); }
function closeAdminPanel() { document.getElementById('adminPanel').classList.remove('open'); }

async function loadOrders() {
  const el = document.getElementById('ordersList');
  el.innerHTML = '<p style="color:var(--c2);text-align:center;padding:24px;font-size:13px">Memuat...</p>';
  const res = await sb.from('orders').select('*, items:order_items(*, product:products(name)), user:profiles(username)').order('created_at', { ascending: false }).limit(50);
  if (res.error || !res.data?.length) { el.innerHTML = '<p style="color:var(--c2);text-align:center;padding:24px;font-size:13px">Belum ada pesanan ✓</p>'; return; }
  el.innerHTML = '';
  res.data.forEach(o => {
    const S = { pending:'⏳ Pending', confirmed:'✓ Dikonfirmasi', preparing:'🔥 Disiapkan', ready:'✅ Siap', completed:'📦 Selesai', cancelled:'✗ Batal' };
    const items = (o.items||[]).map(i => `${i.quantity}× ${i.product?.name||'?'}`).join(', ');
    const time = new Date(o.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-header"><strong>@${o.user?.username||'?'}</strong><span class="order-status s-${o.status}">${S[o.status]||o.status}</span></div>
      <div class="order-items">${items}</div>
      <div class="order-meta">Rp${o.total.toLocaleString('id-ID')} · ${time}${o.note ? ' · '+o.note : ''}</div>
      <div class="order-actions">
        <button class="btn btn-sm btn-primary" onclick="updateStatus('${o.id}','confirmed')">Konfirmasi</button>
        <button class="btn btn-sm btn-ghost" onclick="updateStatus('${o.id}','preparing')">Siapkan</button>
        <button class="btn btn-sm btn-ghost" onclick="updateStatus('${o.id}','ready')">Siap</button>
        <button class="btn btn-sm btn-ghost" onclick="updateStatus('${o.id}','completed')">Selesai</button>
        <button class="btn btn-sm btn-danger" onclick="updateStatus('${o.id}','cancelled')">Batal</button>
      </div>`;
    el.appendChild(card);
  });
}

async function updateStatus(id, status) {
  await sb.from('orders').update({ status }).eq('id', id);
  showToast('Status: ' + status, 'success'); loadOrders();
}

async function loadProducts() {
  const el = document.getElementById('productsList');
  el.innerHTML = '<p style="color:var(--c2);text-align:center;padding:16px;font-size:13px">Memuat...</p>';
  const res = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (res.error || !res.data?.length) { el.innerHTML = '<p style="color:var(--c2);text-align:center;padding:16px;font-size:13px">Belum ada menu</p>'; return; }
  el.innerHTML = '';
  res.data.forEach(p => {
    const row = document.createElement('div');
    row.className = 'prod-row';
    row.innerHTML = `<div><strong>${p.name}</strong><div style="font-size:11px;color:var(--c2)">${p.category} · Rp${p.price.toLocaleString('id-ID')} ${p.available?'':'· <em>off</em>'}</div></div>
      <div style="display:flex;gap:4px"><button class="btn btn-sm btn-ghost" onclick="toggleProd('${p.id}',${!p.available})">${p.available?'Hide':'Show'}</button><button class="btn btn-sm btn-danger" onclick="delProd('${p.id}')">Hapus</button></div>`;
    el.appendChild(row);
  });
}

async function toggleProd(id, available) { await sb.from('products').update({ available }).eq('id', id); loadProducts(); fetchProducts(); }
async function delProd(id) { if (!confirm('Hapus?')) return; await sb.from('products').delete().eq('id', id); loadProducts(); fetchProducts(); }

async function handleAddProduct(e) {
  e.preventDefault();
  const payload = { name:document.getElementById('prodName').value.trim(), description:document.getElementById('prodDesc').value.trim()||null, price:parseInt(document.getElementById('prodPrice').value), category:document.getElementById('prodCat').value, image_url:document.getElementById('prodImg').value.trim()||null, available:true };
  if (!payload.name || !payload.price || !payload.category) return showToast('Nama, harga, kategori wajib', 'error');
  await sb.from('products').insert(payload);
  showToast('Menu ditambahkan ☕', 'success');
  document.getElementById('addProductForm').reset(); loadProducts(); fetchProducts();
}

function bindAdminEvents() {
  document.getElementById('closeAdmin').addEventListener('click', closeAdminPanel);
  document.getElementById('adminOverlay').addEventListener('click', closeAdminPanel);
  document.getElementById('adminBtn').addEventListener('click', openAdminPanel);
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const s = tab.dataset.section;
      document.getElementById('adminOrders').style.display = s === 'orders' ? 'block' : 'none';
      document.getElementById('adminMenu').style.display = s === 'menu' ? 'block' : 'none';
      if (s === 'orders') loadOrders(); if (s === 'menu') loadProducts();
    });
  });
  document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
}
