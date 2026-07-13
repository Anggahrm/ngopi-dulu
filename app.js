const $ = s => document.querySelector(s);
const CAT = {
  coffee:    { label:'Kopi',     emoji:'☕', cls:'cat-coffee' },
  'non-coffee':{ label:'Non-Kopi',emoji:'🍵', cls:'cat-noncoffee' },
  food:      { label:'Makanan',  emoji:'🍔', cls:'cat-food' },
  pastry:    { label:'Pastry',   emoji:'🥐', cls:'cat-pastry' },
};

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents(); bindAuthEvents(); bindAdminEvents();
  await initAuth(); fetchProducts(); renderCart();
});

// ── Fetch ──
async function fetchProducts() {
  if (SUPABASE_URL.includes('YOUR_PROJECT')) { APP.products = mock(); render(); return; }
  const res = await sb.from('products').select('*').order('created_at', { ascending: false });
  APP.products = res.data || []; render();
}

// ── Render ──
function render() {
  const grid = $('#productGrid');
  const empty = $('#emptyState');
  const list = APP.products.filter(p => {
    const okCat = APP.activeFilter === 'all' || p.category === APP.activeFilter;
    const okQ = !APP.searchQuery || p.name.toLowerCase().includes(APP.searchQuery) || (p.description||'').toLowerCase().includes(APP.searchQuery);
    return okCat && okQ && (p.available || APP.profile?.role === 'admin');
  });
  grid.innerHTML = '';
  if (!list.length) { empty.style.display = 'flex'; grid.style.display = 'none'; return; }
  empty.style.display = 'none'; grid.style.display = 'grid';
  list.forEach(p => grid.appendChild(buildProductCard(p)));
  if (!reduced()) anime({ targets: grid.querySelectorAll('.product-card'), opacity:[0,1], translateY:[16,0], duration:250, delay:anime.stagger(30), easing:'easeOutQuart' });
}

function buildProductCard(p) {
  const card = document.createElement('div');
  card.className = 'product-card' + (p.available ? '' : ' unavailable');
  const cat = CAT[p.category] || { emoji:'☕', label:p.category, cls:'' };
  card.innerHTML = `
    <div class="product-thumb">${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" loading="lazy">` : `<span class="product-placeholder">${cat.emoji}</span>`}</div>
    <div class="product-body">
      <span class="product-badge ${cat.cls}">${cat.emoji} ${cat.label}</span>
      <h3 class="product-name">${p.name}</h3>
      ${p.description ? `<p class="product-desc">${p.description}</p>` : ''}
      <div class="product-footer">
        <span class="product-price">Rp${p.price.toLocaleString('id-ID')}</span>
        ${p.available ? `<button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${p.id}">+ Keranjang</button>` : '<span class="product-oos">Habis</span>'}
      </div>
    </div>`;
  card.querySelector('.add-to-cart-btn')?.addEventListener('click', e => { e.stopPropagation(); addToCart(p); });
  return card;
}

// ── Cart ──
function addToCart(product) {
  const existing = APP.cart.find(i => i.id === product.id);
  if (existing) { existing.qty++; }
  else { APP.cart.push({ id: product.id, name: product.name, price: product.price, qty: 1, image_url: product.image_url }); }
  saveCart(); renderCart();
  showToast(`${product.name} ditambahkan ke keranjang`, 'success');
}

function removeFromCart(productId) {
  APP.cart = APP.cart.filter(i => i.id !== productId);
  saveCart(); renderCart();
}

function updateCartQty(productId, delta) {
  const item = APP.cart.find(i => i.id === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) APP.cart = APP.cart.filter(i => i.id !== productId);
  saveCart(); renderCart();
}

function renderCart() {
  const items = $('#cartItems');
  const total = $('#cartTotal');
  const count = $('#cartCount');
  const checkoutBtn = $('#checkoutBtn');
  count.textContent = APP.cart.reduce((s, i) => s + i.qty, 0) || '';

  if (!APP.cart.length) {
    items.innerHTML = '<p style="color:var(--c2);text-align:center;padding:24px;font-size:13px">Keranjang kosong</p>';
    total.textContent = 'Rp0'; checkoutBtn.disabled = true; return;
  }
  checkoutBtn.disabled = false;
  items.innerHTML = '';
  APP.cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-info">
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-price">Rp${(item.price * item.qty).toLocaleString('id-ID')}</span>
      </div>
      <div class="cart-item-qty">
        <button class="qty-btn" onclick="updateCartQty('${item.id}',-1)">−</button>
        <span>${item.qty}</span>
        <button class="qty-btn" onclick="updateCartQty('${item.id}',1)">+</button>
        <button class="qty-btn qty-remove" onclick="removeFromCart('${item.id}')">✕</button>
      </div>`;
    items.appendChild(row);
  });
  const tot = APP.cart.reduce((s, i) => s + i.price * i.qty, 0);
  total.textContent = 'Rp' + tot.toLocaleString('id-ID');
}

// ── Checkout ──
async function handleCheckout() {
  if (!APP.user) { openAuthModal('login'); return; }
  if (!APP.cart.length) return;

  const note = prompt('Catatan untuk pesanan (opsional):') || '';
  const total = APP.cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Create order
  const { data: order, error: orderErr } = await sb.from('orders').insert({ user_id: APP.user.id, total, note }).select().single();
  if (orderErr) return showToast('Gagal membuat pesanan', 'error');

  // Create order items
  const items = APP.cart.map(i => ({ order_id: order.id, product_id: i.id, quantity: i.qty, price: i.price }));
  await sb.from('order_items').insert(items);

  APP.cart = []; saveCart(); renderCart();
  closeModal($('#cartDrawer'));
  showToast('Pesanan berhasil! ☕ Pesananmu sedang diproses.', 'success');
}

// ── Cart drawer ──
function toggleCart() {
  const drawer = $('#cartDrawer');
  if (drawer.classList.contains('open')) { drawer.classList.remove('open'); }
  else { drawer.classList.add('open'); renderCart(); }
}

// ── Events ──
function bindEvents() {
  $('#cartBtn').addEventListener('click', toggleCart);
  $('#closeCart').addEventListener('click', toggleCart);
  $('#cartOverlay').addEventListener('click', toggleCart);
  $('#checkoutBtn').addEventListener('click', handleCheckout);

  let st;
  $('#searchInput').addEventListener('input', e => {
    clearTimeout(st);
    st = setTimeout(() => { APP.searchQuery = e.target.value.trim().toLowerCase(); render(); }, 200);
  });

  $('#filterNav').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    APP.activeFilter = btn.dataset.cat;
    if (!reduced()) anime({ targets: btn, scale:[0.9,1.06,1], duration:250, easing:'easeOutBack' });
    render();
  });

  [$('#authModal')].forEach(d => d?.addEventListener('click', e => { if (e.target === d) closeModal(d); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if ($('#authModal').open) closeModal($('#authModal')); if ($('#cartDrawer').classList.contains('open')) toggleCart(); } });

  // Swipe-to-dismiss
  [$('#authModal')].forEach(d => {
    const panel = d?.querySelector('.modal-panel');
    if (!panel) return;
    let startY = 0, dragging = false;
    panel.addEventListener('touchstart', e => { if (panel.scrollTop > 0) return; startY = e.touches[0].clientY; dragging = true; }, { passive: true });
    panel.addEventListener('touchmove', e => { if (!dragging) return; const dy = e.touches[0].clientY - startY; if (dy > 0) panel.style.transform = 'translateY(' + Math.min(dy * 0.5, 100) + 'px)'; }, { passive: true });
    panel.addEventListener('touchend', e => { if (!dragging) return; dragging = false; panel.style.transform = ''; if (e.changedTouches[0].clientY - startY > 80) closeModal(d); });
  });
}

function openModal(el) { el.showModal(); const p = el.querySelector('.modal-panel'); if (!reduced()) anime({ targets:p, opacity:[0,1], translateY:[14,0], scale:[0.96,1], duration:220, easing:'easeOutQuart' }); }
function closeModal(el) { const p = el.querySelector('.modal-panel'); const finish = () => el.close(); if (!reduced() && p) anime({ targets:p, opacity:0, translateY:8, scale:0.97, duration:160, easing:'easeInQuad', complete:finish }); else finish(); }
function showToast(msg, type) { type = type || 'success'; const el = document.createElement('div'); el.className = 'toast ' + type; el.innerHTML = `<span class="toast-dot"></span>${msg}`; $('#toastStack').appendChild(el); anime({ targets:el, translateX:['115%','0%'], opacity:[0,1], duration:240, easing:'easeOutQuart' }); setTimeout(() => anime({ targets:el, translateX:'115%', opacity:0, duration:200, easing:'easeInQuad', complete:() => el.remove() }), 3200); }
function reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

// ── Mock data ──
function mock() {
  return [
    { id:'p1', name:'Es Kopi Susu', description:'Kopi robusta + susu segar + gula aren', price:28000, category:'coffee', image_url:'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80', available:true },
    { id:'p2', name:'Americano', description:'Espresso double shot + air panas', price:25000, category:'coffee', image_url:'https://images.unsplash.com/photo-1510707579792-24e578c23bf0?w=600&q=80', available:true },
    { id:'p3', name:'Caramel Latte', description:'Latte + karamel homemade', price:32000, category:'coffee', image_url:'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&q=80', available:true },
    { id:'p4', name:'Matcha Latte', description:'Matcha premium Jepang + susu', price:30000, category:'non-coffee', image_url:'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&q=80', available:true },
    { id:'p5', name:'Thai Tea', description:'Teh Thailand + susu kental manis', price:22000, category:'non-coffee', image_url:'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&q=80', available:true },
    { id:'p6', name:'Croissant Coklat', description:'Croissant renyah + filling coklat', price:18000, category:'pastry', image_url:'https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=600&q=80', available:true },
    { id:'p7', name:'Nasi Goreng Kampung', description:'Nasi goreng dengan telur & kerupuk', price:35000, category:'food', image_url:'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80', available:true },
    { id:'p8', name:'Sandwich Triple', description:'Roti sourdough + ayam + keju + sayur', price:38000, category:'food', image_url:'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80', available:true },
  ];
}
