// config.js — GANTI dengan credentials Supabase kamu
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_KEY = 'YOUR_ANON_KEY';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

const APP = {
  user: null,
  profile: null,
  products: [],
  cart: JSON.parse(localStorage.getItem('ngopi_cart') || '[]'),
  activeFilter: 'all',
  searchQuery: '',
};

function saveCart() { localStorage.setItem('ngopi_cart', JSON.stringify(APP.cart)); }
