// ========================
// DartNet - Core App JS
// ========================

const API = '';

// Token management
function getToken() { return localStorage.getItem('dartnet_token'); }
function setToken(t) { localStorage.setItem('dartnet_token', t); }
function removeToken() { localStorage.removeItem('dartnet_token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('dartnet_user')); } catch { return null; } }
function setUser(u) { localStorage.setItem('dartnet_user', JSON.stringify(u)); }
function removeUser() { localStorage.removeItem('dartnet_user'); }

// Auth check
function requireAuth() {
  if (!getToken()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

function requireAdmin() {
  const u = getUser();
  if (!u || !u.is_admin) {
    window.location.href = '/dashboard.html';
    return false;
  }
  return true;
}

// API helper
async function api(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (res.status === 401) {
      removeToken();
      removeUser();
      window.location.href = '/login.html';
      return null;
    }

    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    return data;
  } catch (err) {
    if (err.message !== 'Failed to fetch') {
      showToast(err.message, 'error');
    }
    throw err;
  }
}

// Toast notifications
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format number
function formatPoints(n) {
  return n.toLocaleString();
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Mobile sidebar toggle
function initSidebar() {
  const toggle = document.querySelector('.mobile-toggle');
  const sidebar = document.querySelector('.sidebar');

  if (toggle && sidebar) {
    // Create overlay for mobile
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
      overlay.classList.toggle('open', sidebar.classList.contains('open'));
    });

    // Close on overlay click
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });

    // Close on clicking outside
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
      }
    });

    // Close sidebar on nav link click (mobile)
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }
      });
    });
  }
}

// Update sidebar user info
function updateSidebarUser() {
  const user = getUser();
  if (!user) return;

  const nameEl = document.querySelector('.user-details .name');
  const levelEl = document.querySelector('.user-details .level');
  const avatarEl = document.querySelector('.user-avatar');

  if (nameEl) nameEl.textContent = user.username;
  if (levelEl) levelEl.textContent = `Level ${user.level || 1}`;
  if (avatarEl) avatarEl.textContent = (user.username || 'U')[0].toUpperCase();
}

// Highlight current nav item
function highlightNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === path) {
      item.classList.add('active');
    }
  });
}

// Logout
function logout() {
  removeToken();
  removeUser();
  window.location.href = '/login.html';
}

// Init common features
document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  updateSidebarUser();
  highlightNav();
});
