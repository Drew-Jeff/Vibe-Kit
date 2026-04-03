// VibeKit Studio - Dashboard JS

// Require authentication
if (!requireAuth()) {
    throw new Error('Not authenticated');
}

const API_BASE = '/api';

// Current view state
let currentView = 'pages';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initUserInfo();
    loadPages();
    initNavigation();
    initVibeSelector();
    initCreatePageForm();
});

// Initialize user info in sidebar
function initUserInfo() {
    const user = getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.username;
        document.getElementById('user-email').textContent = user.email;
        document.getElementById('user-avatar').textContent = user.username.charAt(0).toUpperCase();
    }
}

// Initialize navigation
function initNavigation() {
    document.getElementById('nav-analytics').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('analytics');
    });

    document.getElementById('nav-submissions').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('submissions');
    });

    document.querySelector('.dashboard-nav a[href="dashboard.html"]').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('pages');
    });
}

// Switch between views
function switchView(view) {
    currentView = view;

    // Update nav active state
    document.querySelectorAll('.dashboard-nav a').forEach(a => a.classList.remove('active'));
    
    // Hide all views
    document.getElementById('pages-view').style.display = 'none';
    document.getElementById('analytics-view').style.display = 'none';
    document.getElementById('submissions-view').style.display = 'none';

    // Show selected view
    switch (view) {
        case 'pages':
            document.getElementById('pages-view').style.display = 'block';
            document.querySelector('.dashboard-nav a[href="dashboard.html"]').classList.add('active');
            loadPages();
            break;
        case 'analytics':
            document.getElementById('analytics-view').style.display = 'block';
            document.getElementById('nav-analytics').classList.add('active');
            loadAnalytics();
            break;
        case 'submissions':
            document.getElementById('submissions-view').style.display = 'block';
            document.getElementById('nav-submissions').classList.add('active');
            loadSubmissions();
            break;
    }
}

// Load user's pages
async function loadPages() {
    const container = document.getElementById('pages-container');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_BASE}/pages`, {
            headers: authHeaders()
        });

        const data = await response.json();

        if (response.ok) {
            if (data.pages.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="bi bi-file-earmark-plus"></i>
                        </div>
                        <h4>No Pages Yet</h4>
                        <p class="text-muted">Create your first landing page to get started!</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#createPageModal">
                            <i class="bi bi-plus-lg me-2"></i>Create Your First Page
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = `<div class="row g-4">${data.pages.map(pageCard).join('')}</div>`;
            }
        } else {
            container.innerHTML = '<p class="text-danger">Failed to load pages.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Network error. Please try again.</p>';
    }
}

// Generate page card HTML
function pageCard(page) {
    const vibePreviewStyles = {
        minimalist: 'background: #ffffff; border: 1px solid #e2e8f0;',
        bold: 'background: linear-gradient(135deg, #dc2626, #ea580c);',
        retro: 'background: #fef3c7;',
        glass: 'background: linear-gradient(135deg, #667eea, #764ba2);',
        dark: 'background: #0f172a;',
        playful: 'background: linear-gradient(135deg, #ec4899, #8b5cf6);'
    };

    return `
        <div class="col-md-6 col-lg-4">
            <div class="page-card">
                <div class="page-card-preview" style="${vibePreviewStyles[page.vibe] || vibePreviewStyles.minimalist}">
                    <span class="page-status ${page.is_published ? 'published' : 'draft'}">
                        ${page.is_published ? 'Published' : 'Draft'}
                    </span>
                </div>
                <div class="page-card-body">
                    <h5 class="page-card-title">${escapeHtml(page.title)}</h5>
                    <div class="page-card-meta mb-3">
                        <span><i class="bi bi-link-45deg me-1"></i>/p/${page.slug}</span>
                        <span><i class="bi bi-eye me-1"></i>${page.view_count || 0} views</span>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="builder.html?id=${page.id}" class="btn btn-sm btn-primary flex-fill">
                            <i class="bi bi-pencil me-1"></i>Edit
                        </a>
                        ${page.is_published ? `
                            <a href="/p/${page.slug}" target="_blank" class="btn btn-sm btn-outline-secondary">
                                <i class="bi bi-box-arrow-up-right"></i>
                            </a>
                        ` : ''}
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePage(${page.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load analytics
async function loadAnalytics() {
    try {
        const response = await fetch(`${API_BASE}/analytics`, {
            headers: authHeaders()
        });

        const data = await response.json();

        if (response.ok) {
            document.getElementById('stats-pages').textContent = data.total_pages || 0;
            document.getElementById('stats-views').textContent = data.total_views || 0;
            document.getElementById('stats-submissions').textContent = data.total_submissions || 0;

            // Views by page
            const viewsByPage = document.getElementById('views-by-page');
            if (data.pages && data.pages.length > 0) {
                viewsByPage.innerHTML = data.pages.map(p => `
                    <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <span>${escapeHtml(p.title)}</span>
                        <span class="badge bg-primary">${p.view_count} views</span>
                    </div>
                `).join('');
            } else {
                viewsByPage.innerHTML = '<p class="text-muted">No data available yet.</p>';
            }
        }
    } catch (error) {
        console.error('Error loading analytics:', error);
    }
}

// Load submissions
async function loadSubmissions() {
    const container = document.getElementById('submissions-container');

    try {
        const response = await fetch(`${API_BASE}/submissions`, {
            headers: authHeaders()
        });

        const data = await response.json();

        if (response.ok && data.submissions && data.submissions.length > 0) {
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="submissions-table">
                        <thead>
                            <tr>
                                <th>Page</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Message</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.submissions.map(s => `
                                <tr>
                                    <td>${escapeHtml(s.page_title)}</td>
                                    <td>${escapeHtml(s.name)}</td>
                                    <td><a href="mailto:${s.email}">${escapeHtml(s.email)}</a></td>
                                    <td>${escapeHtml(s.message.substring(0, 100))}${s.message.length > 100 ? '...' : ''}</td>
                                    <td>${new Date(s.submitted_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-muted">No submissions yet.</p>';
        }
    } catch (error) {
        container.innerHTML = '<p class="text-danger">Failed to load submissions.</p>';
    }
}

// Initialize vibe selector in modal
function initVibeSelector() {
    document.querySelectorAll('#createPageModal .vibe-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('#createPageModal .vibe-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            document.getElementById('page-vibe').value = option.dataset.vibe;
        });
    });
}

// Initialize create page form
function initCreatePageForm() {
    document.getElementById('create-page-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('page-title').value;
        const slug = document.getElementById('page-slug').value;
        const vibe = document.getElementById('page-vibe').value;

        try {
            const response = await fetch(`${API_BASE}/pages`, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ title, slug, vibe })
            });

            const data = await response.json();

            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('createPageModal')).hide();
                window.location.href = `builder.html?id=${data.page.id}`;
            } else {
                alert(data.error || 'Failed to create page');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    });

    // Auto-generate slug from title
    document.getElementById('page-title').addEventListener('input', (e) => {
        const slug = e.target.value
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
        document.getElementById('page-slug').value = slug;
    });
}

// Delete page
async function deletePage(pageId) {
    if (!confirm('Are you sure you want to delete this page? This cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/pages/${pageId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });

        if (response.ok) {
            loadPages();
        } else {
            alert('Failed to delete page');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
