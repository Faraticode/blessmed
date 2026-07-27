// Renders the sidebar into #sidebar-root and highlights the active page.
// Usage: <div id="sidebar-root"></div><script>renderSidebar('dashboard')</script>

function renderSidebar(activePage) {
  const user = Auth.getUser();
  const items = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: '&#9679;' },
    { key: 'profile', label: 'Health Profile', href: 'profile.html', icon: '&#9679;' },
    { key: 'records', label: 'Health Records', href: 'records.html', icon: '&#9679;' },
    { key: 'emergency', label: 'Emergency QR', href: 'emergency.html', icon: '&#9679;' },
    { key: 'tips', label: 'Health Tips', href: 'tips.html', icon: '&#9679;' }
  ];

  const navHtml = items
    .map(
      (item) => `
      <a class="nav-item ${item.key === activePage ? 'active' : ''}" href="${item.href}">
        <span class="dot"></span>${item.label}
      </a>`
    )
    .join('');

  const root = document.getElementById('sidebar-root');
  root.innerHTML = `
    <div class="sidebar">
      <div class="sidebar-brand">
        <img src="assets/logo.jpg" alt="BlessMed logo" />
        <span>BlessMed</span>
      </div>
      <nav class="nav-list">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-user">${user ? user.fullName : ''}</div>
        <button class="btn btn-secondary btn-block" id="logout-btn">Log out</button>
        <button class="logout-btn-mobile" id="logout-btn-mobile" aria-label="Log out" title="Log out">Log out</button>
      </div>
    </div>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => Auth.logout());
  document.getElementById('logout-btn-mobile').addEventListener('click', () => Auth.logout());
}
