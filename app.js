const $ = s => document.querySelector(s);
const CAT = {
  coffee:     { label:'Kopi',      emoji:'☕' },
  'non-coffee':{ label:'Non-Kopi', emoji:'🍵' },
  food:       { label:'Makanan',   emoji:'🍽️' },
  pastry:     { label:'Pastry',    emoji:'🥐' },
};

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents(); bindAuthEvents(); bindAdminEvents();
  await initAuth(); fetchProducts();
});

// ── Fetch ──
async function fetchProducts() {
  if (SUPABASE_URL.includes('YOUR_PROJECT')) { APP.products = mock(); render(); return; }
  const res = await sb.from('products').select('*').order('created_at', { ascending: false });
  APP.products = res.data || []; render();
}

// ── Render ──
function render() {
  const content = $('#menuContent');
  const empty = $('#emptyState');
  const hero = $('#heroSection');

  const filtered = APP.products.filter(p => {
    const okCat = APP.activeFilter === 'all' || p.category === APP.activeFilter;
    const okQ = !APP.searchQuery || p.name.toLowerCase().includes(APP.searchQuery) || (p.description||'').toLowerCase().includes(APP.searchQuery);
    return okCat && okQ && (p.available || APP.profile?.role === 'admin');
  });

  if (!filtered.length) {
    content.innerHTML = ''; empty.style.display = 'flex'; hero.style.display = 'none'; return;
  }
  empty.style.display = 'none'; hero.style.display = '';

  // Hero: first item
  const heroItem = filtered[0];
  const heroCat = CAT[heroItem.category] || { emoji:'☕', label:heroItem.category };
  $('#heroImg').src = heroItem.image_url || '';
  $('#heroImg').alt = heroItem.name;
  $('#heroImg').onerror = function(){ this.style.display='none'; };
  $('#heroTag').textContent = heroCat.emoji + ' ' + heroCat.label;
  $('#heroTitle').textContent = heroItem.name;
  $('#heroDesc').textContent = heroItem.description || '';
  $('#heroPrice').textContent = 'Rp' + heroItem.price.toLocaleString('id-ID');
  $('#heroAddBtn').onclick = () => addToCart(heroItem);

  // Group by category
  const cats = {};
  filtered.slice(1).forEach(p => {
    if (!cats[p.category]) cats[p.category] = [];
    cats[p.category].push(p);
  });

  content.innerHTML = '';
  const order = ['coffee','non-coffee','food','pastry'];
  order.forEach(catKey => {
    const items = cats[catKey];
    if (!items || !items.length) return;
    const cat = CAT[catKey] || { emoji:'☕', label:catKey };

    const section = document.createElement('section');
    section.className = 'cat-section';

    const header = document.createElement('div');
    header.className = 'cat-header';
    header.innerHTML = `<h2 class="cat-title">${cat.emoji} ${cat.label}</h2><span class="cat-count">${items.length} item</span>`;

    const list = document.createElement('div');
    list.className = 'menu-list';

    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'menu-item' + (item.available ? '' : ' menu-unavailable');
      row.innerHTML = `
        ${item.image_url
          ? `<img class="menu-thumb" src="${item.image_url}" alt="${item.name}" loading="lazy" onerror="this.outerHTML='<div class=\\'menu-thumb-placeholder\\'>${cat.emoji}</div>'">`
          : `<div class="menu-thumb-placeholder">${cat.emoji}</div>`
        }
        <div class="menu-info">
          <div class="menu-name">${item.name}</div>
          <div class="menu-desc">${item.description || ''}</div>
        </div>
        <div class="menu-right">
          <span class="menu-price">Rp${item.price.toLocaleString('id-ID')}</span>
          ${item.available ? `<button class="menu-add" title="Tambah ke keranjang">+</button>` : ''}
        </div>`;
      const addBtn = row.querySelector('.menu-add');
      if (addBtn) addBtn.addEventListener('click', () => {
        addToCart(item);
        // anime.js pulse on button
        if (!reduced()) anime({ targets: addBtn, scale:[1,1.3,1], duration:300, easing:'easeOutBack' });
      });
      list.appendChild(row);
    });

    section.appendChild(header);
    section.appendChild(list);
    content.appendChild(section);
  });

  // Animate sections in
  if (!reduced()) {
    anime({ targets: '.cat-section', opacity:[0,1], translateY:[12,0], duration:300, delay:anime.stagger(80), easing:'easeOutQuart' });
  }
}

// ── Cart ──
function addToCart(product) {
  const existing = APP.cart.find(i => i.id === product.id);
  if (existing) existing.qty++;
  else APP.cart.push({ id:product.id, name:product.name, price:product.price, qty:1 });
  saveCart(); renderCartUI();
  showToast(`${product.name} ditambahkan`, 'success');
}

function removeFromCart(id) {
  APP.cart = APP.cart.filter(i => i.id !== id);
  saveCart(); renderCartUI();
}

function updateQty(id, delta) {
  const item = APP.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) APP.cart = APP.cart.filter(i => i.id !== id);
  saveCart(); renderCartUI();
}

function renderCartUI() {
  const body = $('#cartBody');
  const total = $('#cartTotal');
  const badge = $('#cartBadge');
  const btn = $('#checkoutBtn');
  const count = APP.cart.reduce((s,i) => s + i.qty, 0);

  // FAB badge
  if (count > 0) { badge.style.display = 'flex'; badge.textContent = count; }
  else badge.style.display = 'none';

  if (!APP.cart.length) {
    body.innerHTML = '<p style="color:var(--c3);text-align:center;padding:24px;font-size:13px">Keranjang kosong</p>';
    total.textContent = 'Rp0'; btn.disabled = true; return;
  }
  btn.disabled = false;
  body.innerHTML = '';
  APP.cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">Rp${(item.price * item.qty).toLocaleString('id-ID')}</div>
      </div>
      <div class="cart-qty">
        <button onclick="updateQty('${item.id}',-1)">−</button>
        <span>${item.qty}</span>
        <button onclick="updateQty('${item.id}',1)">+</button>
      </div>`;
    body.appendChild(row);
  });
  const tot = APP.cart.reduce((s,i) => s + i.price * i.qty, 0);
  total.textContent = 'Rp' + tot.toLocaleString('id-ID');
}

function toggleCart() {
  const panel = $('#cartPanel');
  const overlay = $('#cartOverlay');
  const isOpen = panel.classList.contains('open');
  if (isOpen) { panel.classList.remove('open'); overlay.classList.remove('open'); }
  else { panel.classList.add('open'); overlay.classList.add('open'); renderCartUI(); }
}

async function handleCheckout() {
  if (!APP.user) { openAuthModal('login'); return; }
  if (!APP.cart.length) return;
  const note = prompt('Catatan (opsional):') || '';
  const total = APP.cart.reduce((s,i) => s + i.price * i.qty, 0);
  const { data: order, error } = await sb.from('orders').insert({ user_id:APP.user.id, total, note }).select().single();
  if (error) return showToast('Gagal membuat pesanan', 'error');
  const items = APP.cart.map(i => ({ order_id:order.id, product_id:i.id, quantity:i.qty, price:i.price }));
  await sb.from('order_items').insert(items);
  APP.cart = []; saveCart(); renderCartUI(); toggleCart();
  showToast('Pesanan berhasil! ☕', 'success');
}

// ── Events ──
function bindEvents() {
  $('#cartFab').addEventListener('click', toggleCart);
  $('#closeCart').addEventListener('click', toggleCart);
  $('#cartOverlay').addEventListener('click', toggleCart);
  $('#checkoutBtn').addEventListener('click', handleCheckout);

  // Search
  let st;
  $('#searchInput').addEventListener('input', e => {
    clearTimeout(st);
    st = setTimeout(() => { APP.searchQuery = e.target.value.trim().toLowerCase(); render(); }, 200);
  });

  // Filter pills
  $('#filterNav').addEventListener('click', e => {
    const pill = e.target.closest('.nav-pill');
    if (!pill) return;
    document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    APP.activeFilter = pill.dataset.cat;
    if (!reduced()) anime({ targets:pill, scale:[0.92,1.05,1], duration:250, easing:'easeOutBack' });
    render();
  });

  // Auth modal backdrop
  $('#authModal').addEventListener('click', e => { if (e.target === $('#authModal')) closeModal($('#authModal')); });

  // Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if ($('#authModal').open) closeModal($('#authModal'));
      if ($('#cartPanel').classList.contains('open')) toggleCart();
    }
  });

  // Swipe-to-dismiss on cart panel
  const cartPanel = $('#cartPanel');
  let cartStartY = 0, cartDragging = false;
  cartPanel.addEventListener('touchstart', e => { cartStartY = e.touches[0].clientY; cartDragging = true; }, { passive:true });
  cartPanel.addEventListener('touchmove', e => {
    if (!cartDragging) return;
    const dy = e.touches[0].clientY - cartStartY;
    if (dy > 0) cartPanel.style.transform = 'translateY(' + Math.min(dy, 150) + 'px)';
  }, { passive:true });
  cartPanel.addEventListener('touchend', e => {
    if (!cartDragging) return;
    cartDragging = false;
    cartPanel.style.transform = '';
    if (e.changedTouches[0].clientY - cartStartY > 80) toggleCart();
  });
}

function openModal(el) { el.showModal(); const p = el.querySelector('.modal-card'); if (p && !reduced()) anime({ targets:p, opacity:[0,1], translateY:[12,0], scale:[0.96,1], duration:220, easing:'easeOutQuart' }); }
function closeModal(el) { const p = el.querySelector('.modal-card'); const f = () => el.close(); if (p && !reduced()) anime({ targets:p, opacity:0, translateY:8, duration:150, easing:'easeInQuad', complete:f }); else f(); }
function showToast(msg, type) { type = type || 'success'; const el = document.createElement('div'); el.className = 'toast ' + type; el.innerHTML = `<span class="toast-dot"></span>${msg}`; $('#toastStack').appendChild(el); anime({ targets:el, translateX:['110%','0%'], opacity:[0,1], duration:240, easing:'easeOutQuart' }); setTimeout(() => anime({ targets:el, translateX:'110%', opacity:0, duration:200, easing:'easeInQuad', complete:() => el.remove() }), 2800); }
function reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

// ── Mock ──
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
