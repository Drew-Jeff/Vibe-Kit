// VibeKit Studio - Page Builder JS

// Require authentication
if (!requireAuth()) {
    throw new Error('Not authenticated');
}

const API_BASE = '/api';

// Get page ID from URL
const urlParams = new URLSearchParams(window.location.search);
const pageId = urlParams.get('id');

if (!pageId) {
    window.location.href = 'dashboard.html';
}

// Page state
let pageData = null;
let currentVibe = 'minimalist';
let isDirty = false;

// Initialize builder
document.addEventListener('DOMContentLoaded', () => {
    loadPage();
    initTabs();
    initVibeSelector();
    initInputListeners();
    initActions();
});

// Load page data
async function loadPage() {
    try {
        const response = await fetch(`${API_BASE}/pages/${pageId}`, {
            headers: authHeaders()
        });

        const data = await response.json();

        if (response.ok) {
            pageData = data.page;
            currentVibe = pageData.vibe || 'minimalist';
            populateForm();
            updateVibeSelector();
            updatePreview();
        } else {
            alert('Page not found');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        alert('Failed to load page');
        window.location.href = 'dashboard.html';
    }
}

// Populate form with page data
function populateForm() {
    document.getElementById('page-title-display').textContent = pageData.title;
    document.getElementById('page-slug-display').textContent = `/p/${pageData.slug}`;

    const content = pageData.content || {};

    // Profile
    document.getElementById('content-name').value = content.name || '';
    document.getElementById('content-title').value = content.title || '';
    document.getElementById('content-bio').value = content.bio || '';

    // Social links
    document.getElementById('content-twitter').value = content.twitter || '';
    document.getElementById('content-github').value = content.github || '';
    document.getElementById('content-linkedin').value = content.linkedin || '';
    document.getElementById('content-website').value = content.website || '';

    // CTA
    document.getElementById('content-cta-text').value = content.ctaText || '';
    document.getElementById('content-cta-link').value = content.ctaLink || '';

    // Contact form
    document.getElementById('content-show-contact').checked = content.showContact || false;
}

// Initialize tabs
function initTabs() {
    document.querySelectorAll('.builder-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.builder-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            document.getElementById('tab-content').style.display = tabName === 'content' ? 'block' : 'none';
            document.getElementById('tab-style').style.display = tabName === 'style' ? 'block' : 'none';
        });
    });
}

// Initialize vibe selector
function initVibeSelector() {
    document.querySelectorAll('#tab-style .vibe-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('#tab-style .vibe-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            currentVibe = option.dataset.vibe;
            isDirty = true;
            updatePreview();
        });
    });
}

// Update vibe selector to show current vibe
function updateVibeSelector() {
    document.querySelectorAll('#tab-style .vibe-option').forEach(option => {
        option.classList.toggle('selected', option.dataset.vibe === currentVibe);
    });
}

// Initialize input listeners for live preview
function initInputListeners() {
    document.querySelectorAll('.content-input').forEach(input => {
        input.addEventListener('input', () => {
            isDirty = true;
            updatePreview();
        });

        input.addEventListener('change', () => {
            isDirty = true;
            updatePreview();
        });
    });
}

// Initialize action buttons
function initActions() {
    document.getElementById('btn-save').addEventListener('click', () => savePage(false));
    document.getElementById('btn-publish').addEventListener('click', () => savePage(true));
}

// Collect content from form
function collectContent() {
    return {
        name: document.getElementById('content-name').value,
        title: document.getElementById('content-title').value,
        bio: document.getElementById('content-bio').value,
        twitter: document.getElementById('content-twitter').value,
        github: document.getElementById('content-github').value,
        linkedin: document.getElementById('content-linkedin').value,
        website: document.getElementById('content-website').value,
        ctaText: document.getElementById('content-cta-text').value,
        ctaLink: document.getElementById('content-cta-link').value,
        showContact: document.getElementById('content-show-contact').checked
    };
}

// Save page
async function savePage(publish = false) {
    const content = collectContent();

    try {
        const response = await fetch(`${API_BASE}/pages/${pageId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({
                content,
                vibe: currentVibe,
                is_published: publish
            })
        });

        const data = await response.json();

        if (response.ok) {
            isDirty = false;
            pageData = data.page;
            
            if (publish) {
                alert(`Page published! View it at: /p/${pageData.slug}`);
            } else {
                alert('Page saved!');
            }
        } else {
            alert(data.error || 'Failed to save page');
        }
    } catch (error) {
        alert('Network error. Please try again.');
    }
}

// Update live preview
function updatePreview() {
    const content = collectContent();
    const iframe = document.getElementById('preview-iframe');
    
    const previewHTML = generatePreviewHTML(content, currentVibe);
    
    iframe.srcdoc = previewHTML;
}

// Generate preview HTML
function generatePreviewHTML(content, vibe) {
    const socialLinks = [];
    if (content.twitter) {
        socialLinks.push(`<a href="${escapeAttr(content.twitter)}" class="social-link" target="_blank"><i class="bi bi-twitter"></i></a>`);
    }
    if (content.github) {
        socialLinks.push(`<a href="${escapeAttr(content.github)}" class="social-link" target="_blank"><i class="bi bi-github"></i></a>`);
    }
    if (content.linkedin) {
        socialLinks.push(`<a href="${escapeAttr(content.linkedin)}" class="social-link" target="_blank"><i class="bi bi-linkedin"></i></a>`);
    }
    if (content.website) {
        socialLinks.push(`<a href="${escapeAttr(content.website)}" class="social-link" target="_blank"><i class="bi bi-globe"></i></a>`);
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css" rel="stylesheet">
    <link href="css/vibes.css" rel="stylesheet">
    <style>
        body { font-size: 14px; }
        .profile-name { font-size: 24px; }
        .profile-avatar { width: 80px; height: 80px; font-size: 32px; }
        .social-link { width: 36px; height: 36px; font-size: 16px; }
        .cta-button { padding: 12px 28px; font-size: 14px; }
    </style>
</head>
<body class="vibe-${vibe}">
    <div class="page-container">
        <div class="page-content">
            <div class="profile-avatar">
                ${content.name ? escapeHtml(content.name.charAt(0).toUpperCase()) : '<i class="bi bi-person"></i>'}
            </div>
            
            <h1 class="profile-name">${escapeHtml(content.name) || 'Your Name'}</h1>
            <p class="profile-title">${escapeHtml(content.title) || 'Your Title'}</p>
            <p class="profile-bio">${escapeHtml(content.bio) || 'Your bio goes here...'}</p>

            ${socialLinks.length > 0 ? `
                <div class="social-links">
                    ${socialLinks.join('')}
                </div>
            ` : ''}

            ${content.ctaText && content.ctaLink ? `
                <div class="cta-section">
                    <a href="${escapeAttr(content.ctaLink)}" class="cta-button">${escapeHtml(content.ctaText)}</a>
                </div>
            ` : ''}

            ${content.showContact ? `
                <div class="contact-form-section">
                    <h3 class="contact-form-title">Get in Touch</h3>
                    <form>
                        <div class="mb-3">
                            <input type="text" class="form-control" placeholder="Your Name" disabled>
                        </div>
                        <div class="mb-3">
                            <input type="email" class="form-control" placeholder="Your Email" disabled>
                        </div>
                        <div class="mb-3">
                            <textarea class="form-control" rows="3" placeholder="Your Message" disabled></textarea>
                        </div>
                        <button type="button" class="btn cta-button w-100" disabled>Send Message</button>
                    </form>
                </div>
            ` : ''}
        </div>
    </div>
</body>
</html>
    `;
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape attribute
function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', (e) => {
    if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});
