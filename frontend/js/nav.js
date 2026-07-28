// Inline placeholder avatar (a generic silhouette) — built as a data URI
// rather than a separate image file, so it can never go missing or 404
// the way an uploaded file can. Shown until the user uploads a real photo.
// Exposed on window so other pages (e.g. profile.html) can reuse the same one.
const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="36" fill="#dbe4ee"/>
    <circle cx="36" cy="28" r="13" fill="#8fa3b8"/>
    <path d="M12 62c3-13 14-20 24-20s21 7 24 20" fill="#8fa3b8"/>
  </svg>
`);
window.DEFAULT_AVATAR = DEFAULT_AVATAR;

// Renders the sidebar into #sidebar-root and highlights the active page.
// Usage: <div id="sidebar-root"></div><script>renderSidebar('dashboard')</script>

function renderSidebar(activePage) {
  const user = Auth.getUser();
  const items = [
    { key: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: '&#9679;' },
    { key: 'blockchain', label: 'Blockchain', href: 'blockchain.html', icon: '&#9679;' },
    { key: 'steps', label: 'Steps', href: 'steps.html', icon: '&#9679;' },
    { key: 'reminders', label: 'Reminders', href: 'reminders.html', icon: '&#9679;' },
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

  const avatarSrc = user?.avatarPath ? `/uploads/${user.avatarPath}` : DEFAULT_AVATAR;

  const root = document.getElementById('sidebar-root');
  root.innerHTML = `
    <div class="sidebar">
      <div class="sidebar-brand">
        <img src="${avatarSrc}" alt="Profile picture" onerror="this.onerror=null; this.src='${DEFAULT_AVATAR}';" />
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