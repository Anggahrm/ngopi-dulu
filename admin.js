// admin.js — Admin panel
function openAdminPanel() {
  if (APP.profile?.role !== 'admin') return;
  document.getElementById('adminPanel').classList.add('open');
  loadOrders();
}

function closeAdminPanel() { document.getElementById('adminPanel').classList.remove('open'); }

async function loadOrders() {
  const listEl = document.getElementById('ordersList');
  listEl.innerHTML = '<p style="color:var(--c2);text-align:center;padding:24px">Memuat...</p>';
  const res = await sb.from('orders').select('*, items:order_items(*, product:products(name)), user:profiles(username)').order('created_at', { ascending: false }).limit(50);
  if (res.error || !res.data?.length) { listEl.innerHTML = '<p style="color:var(--c2);text-align:center;padding:24px">Belum ada pesanan ✓</p>'; return; }
  listEl.innerHTML = '';
  res.data.forEach(o => listEl.appendChild(buildOrderCard(o)));
}

function buildOrderCard(order) {
  const STATUS = { pending:'⏳ Pending', confirmed:'✓ Dikonfirmasi', preparing:'🔥 Sedang Disiapkan', ready:'✅ Siap Diambil', completed:'📦 Selesai', cancelled:'✗ Dibatalkan' };
  const card = document.createElement('div');
  card.className = 'order-card';
  card.id = 'order-' + order.id;
  const items = (order.items || []).map(i => `${i.quantity}× ${i.product?.name || '?'}`).join(', ');
  const time = new Date(order.created_at).toLocaleString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
  card.innerHTML = `
    <div class="order-card-header">
      <strong>@${order.user?.username || '?'}</strong>
      <span class="order-status status-${order.status}">${STATUS[order.status] || order.status}</span>
    </div>
    <div class="order-card-items">${items}</div>
    <div class="order-card-meta">Rp${order.total.toLocaleString('id-ID')} · ${time}${order.note ? '<br>Note: ' + order.note : ''}</div>
    <div class="order-card-actions">
      <button class="btn btn-sm btn-primary" onclick="updateOrderStatus('${order.id}','confirmed')">Konfirmasi</button>
      <button class="btn btn-sm btn-ghost" onclick="updateOrderStatus('${order.id}','preparing')">Siapkan</button>
      <button class="btn btn-sm btn-ghost" onclick="updateOrderStatus('${order.id}','ready')">Siap</button>
      <button class="btn btn-sm btn-ghost" onclick="updateOrderStatus('${order.id}','completed')">Selesai</button>
      <button class="btn btn-sm btn-danger" onclick="updateOrderStatus('${order.id}','cancelled')">Batal</button>
    </div>`;
  return card;
}

async function updateOrderStatus(orderId, status) {
  const res = await sb.from('orders').update({ status }).eq('id', orderId);
  if (res.error) return showToast('Gagal update status', 'error');
  showToast('Status diubah ke ' + status, 'success');
  loadOrders();
}

// ── Product management ──
async function loadProducts() {
  const listEl = document.getElementById('productsList');
  listEl.innerHTML = '<p style="color:var(--c2);text-align:center;padding:24px">Memuat...</p>';
  const res = await sb.from('products').select('*').order('created_at', { ascending: false });
  if (res.error || !res.data?.length) { listEl.innerHTML = '<p style="color:var(--c2);text-align:center;padding:24px">Belum ada produk</p>'; return; }
  listEl.innerHTML = '';
  res.data.forEach(p => {
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
      <div class="product-row-info">
        <strong>${p.name}</strong>
        <span style="color:var(--c2);font-size:12px">${p.category} · Rp${p.price.toLocaleString('id-ID')} ${p.available ? '' : '· <em>tidak tersedia</em>'}</span>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-sm btn-ghost" onclick="toggleProduct('${p.id}', ${!p.available})">${p.available ? 'Sembunyikan' : 'Tampilkan'}</button>
        <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Hapus</button>
      </div>`;
    listEl.appendChild(row);
  });
}

async function toggleProduct(id, available) {
  await sb.from('products').update({ available }).eq('id', id);
  showToast(available ? 'Produk ditampilkan' : 'Produk disembunyikan', 'success');
  loadProducts(); fetchProducts();
}

async function deleteProduct(id) {
  if (!confirm('Hapus produk ini?')) return;
  await sb.from('products').delete().eq('id', id);
  showToast('Produk dihapus', 'success');
  loadProducts(); fetchProducts();
}

async function handleAddProduct(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('prodName').value.trim(),
    description: document.getElementById('prodDesc').value.trim() || null,
    price: parseInt(document.getElementById('prodPrice').value),
    category: document.getElementById('prodCategory').value,
    image_url: document.getElementById('prodImage').value.trim() || null,
    available: true,
  };
  if (!payload.name || !payload.price || !payload.category) return showToast('Nama, harga, kategori wajib', 'error');
  const res = await sb.from('products').insert(payload);
  if (res.error) return showToast(res.error.message, 'error');
  showToast('Produk ditambahkan ☕', 'success');
  document.getElementById('addProductForm').reset();
  loadProducts(); fetchProducts();
}

function bindAdminEvents() {
  document.getElementById('closeAdminPanel').addEventListener('click', closeAdminPanel);
  document.getElementById('adminOverlay').addEventListener('click', closeAdminPanel);
  document.getElementById('adminBtn').addEventListener('click', openAdminPanel);
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const s = tab.dataset.section;
      document.getElementById('adminOrders').style.display = s === 'orders' ? 'block' : 'none';
      document.getElementById('adminMenu').style.display = s === 'menu' ? 'block' : 'none';
      if (s === 'orders') loadOrders();
      if (s === 'menu') loadProducts();
    });
  });
  document.getElementById('addProductForm')?.addEventListener('submit', handleAddProduct);
}
