// config.js
const SUPABASE_URL = 'https://hdyqjzreorubcxdxagtp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkeXFqenJlb3J1YmN4ZHhhZ3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Mzk4ODYsImV4cCI6MjA5OTUxNTg4Nn0.L4DTMnyuhTeYh5BoKWg-KKelPB9E3JGEOruc-P4fYu8';

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
