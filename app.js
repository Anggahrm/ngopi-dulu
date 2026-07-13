const $ = s => document.querySelector(s);
const CAT = {
  coffee:     { label:'Coffee',    emoji:'☕' },
  'non-coffee':{ label:'Non-Coffee',emoji:'🍵' },
  food:       { label:'Food',      emoji:'🍽️' },
  pastry:     { label:'Pastry',    emoji:'🥐' },
};

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents(); bindAuthEvents(); bindAdminEvents();
  await initAuth(); fetchProducts();
});

async function fetchProducts() {
  if (SUPABASE_URL.includes('YOUR_PROJECT')) { APP.products = mock(); render(); return; }
  const res = await sb.from('products').select('*').order('created_at', { ascending: false });
  APP.products = res.data || []; render();
}

function render() {
  const content = $('#menuContent');
  const empty = $('#emptyState');
  const hero = $('#heroSection');

  const filtered = APP.products.filter(p => {
    const okCat = APP.activeFilter === 'all' || p.category === APP.activeFilter;
    const okQ = !APP.searchQuery || p.name.toLowerCase().includes(APP.searchQuery) || (p.description||'').toLowerCase().includes(APP.searchQuery);
    return okCat && okQ && (p.available || APP.profile?.role === 'admin');
  });

  if (!filtered.length) { content.innerHTML = ''; empty.style.display = 'flex'; hero.style.display = 'none'; return; }
  empty.style.display = 'none'; hero.style.display = '';

  // Hero: first item
  const h = filtered[0];
  $('#heroImg').src = h.image_url || '';
  $('#heroImg').alt = h.name;
  $('#heroImg').onerror = function(){ this.style.display='none'; };
  $('#heroName').textContent = h.name;
  $('#heroDesc').textContent = h.description || '';
  $('#heroPrice').textContent = 'Rp' + h.price.toLocaleString('id-ID');
  $('#heroAddBtn').onclick = () => addToCart(h);

  // Group remaining by category
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

    const section = document.createElement('div');
    section.className = 'section';
    section.innerHTML = `<h2 class="section-title">${cat.emoji} ${cat.label}</h2>`;

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px';

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'menu-card' + (item.available ? '' : ' menu-unavailable');
      card.innerHTML = `
        ${item.image_url ? `<img class="menu-card-img" src="${item.image_url}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'">` : `<div class="menu-card-img" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:var(--card)">${cat.emoji}</div>`}
        <div class="menu-card-info">
          <div class="menu-card-name">${item.name}</div>
          <div class="menu-card-desc">${item.description || ''}</div>
          <div class="menu-card-price">Rp${item.price.toLocaleString('id-ID')}</div>
        </div>
        ${item.available ? `<button class="menu-card-add" title="Add to cart">+</button>` : ''}`;
      const addBtn = card.querySelector('.menu-card-add');
      if (addBtn) addBtn.addEventListener('click', () => {
        addToCart(item);
        if (!reduced()) anime({ targets:addBtn, scale:[1,1.3,1], duration:250, easing:'easeOutBack' });
      });
      grid.appendChild(card);
    });

    section.appendChild(grid);
    content.appendChild(section);
  });

  if (!reduced()) anime({ targets:'.menu-card', opacity:[0,1], translateY:[8,0], duration:200, delay:anime.stagger(25), easing:'easeOutQuart' });
}

// ── Cart ──
function addToCart(p) {
  const existing = APP.cart.find(i => i.id === p.id);
  if (existing) existing.qty++;
  else APP.cart.push({ id:p.id, name:p.name, price:p.price, qty:1 });
  saveCart(); renderCart();
  showToast(`${p.name} ditambahkan`, 'success');
}

function removeFromCart(id) { APP.cart = APP.cart.filter(i => i.id !== id); saveCart(); renderCart(); }

function updateQty(id, delta) {
  const item = APP.cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) APP.cart = APP.cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}

function renderCart() {
  const items = $('#cartItems');
  const sub = $('#cartSubtotal');
  const tax = $('#cartTax');
  const total = $('#cartTotal');
  const btn = $('#checkoutBtn');

  if (!APP.cart.length) {
    items.innerHTML = '<div class="cart-empty">Keranjang kosong</div>';
    sub.textContent = 'Rp0'; tax.textContent = 'Rp0'; total.textContent = 'Rp0'; btn.disabled = true; return;
  }
  btn.disabled = false;
  items.innerHTML = '';
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
    items.appendChild(row);
  });

  const subtotal = APP.cart.reduce((s,i) => s + i.price * i.qty, 0);
  const taxAmount = Math.round(subtotal * 0.1);
  sub.textContent = 'Rp' + subtotal.toLocaleString('id-ID');
  tax.textContent = 'Rp' + taxAmount.toLocaleString('id-ID');
  total.textContent = 'Rp' + (subtotal + taxAmount).toLocaleString('id-ID');
}

async function handleCheckout() {
  if (!APP.user) { openAuthModal('login'); return; }
  if (!APP.cart.length) return;
  const note = prompt('Catatan (opsional):') || '';
  const subtotal = APP.cart.reduce((s,i) => s + i.price * i.qty, 0);
  const total = subtotal + Math.round(subtotal * 0.1);
  const { data: order, error } = await sb.from('orders').insert({ user_id:APP.user.id, total, note }).select().single();
  if (error) return showToast('Gagal membuat pesanan', 'error');
  const items = APP.cart.map(i => ({ order_id:order.id, product_id:i.id, quantity:i.qty, price:i.price }));
  await sb.from('order_items').insert(items);
  APP.cart = []; saveCart(); renderCart();
  showToast('Pesanan berhasil! ☕', 'success');
}

// ── Events ──
function bindEvents() {
  $('#checkoutBtn').addEventListener('click', handleCheckout);
  let st;
  $('#searchInput').addEventListener('input', e => {
    clearTimeout(st);
    st = setTimeout(() => { APP.searchQuery = e.target.value.trim().toLowerCase(); render(); }, 200);
  });
  $('#filterNav').addEventListener('click', e => {
    const tab = e.target.closest('.nav-tab');
    if (!tab) return;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    APP.activeFilter = tab.dataset.cat;
    if (!reduced()) anime({ targets:tab, scale:[0.92,1.05,1], duration:250, easing:'easeOutBack' });
    render();
  });
  $('#authModal').addEventListener('click', e => { if (e.target === $('#authModal')) closeModal($('#authModal')); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#authModal').open) closeModal($('#authModal')); });
}

function openModal(el) { el.showModal(); const p = el.querySelector('.modal-card'); if (p && !reduced()) anime({ targets:p, opacity:[0,1], translateY:[12,0], scale:[0.96,1], duration:200, easing:'easeOutQuart' }); }
function closeModal(el) { const p = el.querySelector('.modal-card'); const f = () => el.close(); if (p && !reduced()) anime({ targets:p, opacity:0, translateY:8, duration:150, easing:'easeInQuad', complete:f }); else f(); }
function showToast(msg, type) { type = type || 'success'; const el = document.createElement('div'); el.className = 'toast ' + type; el.innerHTML = `<span class="toast-dot"></span>${msg}`; $('#toastStack').appendChild(el); anime({ targets:el, translateX:['110%','0%'], opacity:[0,1], duration:200, easing:'easeOutQuart' }); setTimeout(() => anime({ targets:el, translateX:'110%', opacity:0, duration:150, easing:'easeInQuad', complete:() => el.remove() }), 2500); }
function reduced() { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

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
