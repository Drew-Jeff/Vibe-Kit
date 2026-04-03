// VibeKit Studio - Public Page JS

const API_BASE = '/api';

// Get page slug from URL
const pathParts = window.location.pathname.split('/');
const pageSlug = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    if (pageSlug) {
        loadPublicPage();
    }
});

// Load public page data
async function loadPublicPage() {
    try {
        const response = await fetch(`${API_BASE}/p/${pageSlug}`);
        const data = await response.json();

        if (response.ok) {
            renderPage(data.page);
        } else {
            showError('Page not found');
        }
    } catch (error) {
        showError('Failed to load page');
    }
}

// Render page content
function renderPage(page) {
    const content = page.content || {};
    const vibe = page.vibe || 'minimalist';

    // Set page metadata
    document.getElementById('page-meta-title').textContent = content.name || page.title || 'VibeKit Page';
    document.getElementById('page-meta-description').content = content.bio || '';

    // Apply vibe
    document.getElementById('page-body').className = `vibe-${vibe}`;

    // Profile
    const avatarEl = document.getElementById('profile-avatar');
    if (content.name) {
        avatarEl.innerHTML = content.name.charAt(0).toUpperCase();
    }

    document.getElementById('profile-name').textContent = content.name || 'Welcome';
    document.getElementById('profile-title').textContent = content.title || '';
    document.getElementById('profile-bio').textContent = content.bio || '';

    // Social links
    const socialLinksEl = document.getElementById('social-links');
    const socialLinks = [];

    if (content.twitter) {
        socialLinks.push(`<a href="${escapeAttr(content.twitter)}" class="social-link" target="_blank" rel="noopener"><i class="bi bi-twitter"></i></a>`);
    }
    if (content.github) {
        socialLinks.push(`<a href="${escapeAttr(content.github)}" class="social-link" target="_blank" rel="noopener"><i class="bi bi-github"></i></a>`);
    }
    if (content.linkedin) {
        socialLinks.push(`<a href="${escapeAttr(content.linkedin)}" class="social-link" target="_blank" rel="noopener"><i class="bi bi-linkedin"></i></a>`);
    }
    if (content.website) {
        socialLinks.push(`<a href="${escapeAttr(content.website)}" class="social-link" target="_blank" rel="noopener"><i class="bi bi-globe"></i></a>`);
    }

    if (socialLinks.length > 0) {
        socialLinksEl.innerHTML = socialLinks.join('');
        socialLinksEl.style.display = 'flex';
    } else {
        socialLinksEl.style.display = 'none';
    }

    // CTA Button
    const ctaSection = document.getElementById('cta-section');
    const ctaButton = document.getElementById('cta-button');
    if (content.ctaText && content.ctaLink) {
        ctaButton.textContent = content.ctaText;
        ctaButton.href = content.ctaLink;
        ctaSection.style.display = 'block';
    }

    // Contact Form
    if (content.showContact) {
        document.getElementById('contact-form-section').style.display = 'block';
        initContactForm(page.id);
    }
}

// Initialize contact form
function initContactForm(pageId) {
    const form = document.getElementById('contact-form');
    const successEl = document.getElementById('contact-success');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;

        try {
            const response = await fetch(`${API_BASE}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page_id: pageId, name, email, message })
            });

            if (response.ok) {
                form.style.display = 'none';
                successEl.style.display = 'block';
            } else {
                alert('Failed to send message. Please try again.');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        }
    });
}

// Show error message
function showError(message) {
    document.getElementById('page-container').innerHTML = `
        <div class="page-content text-center">
            <div class="profile-avatar" style="background: #f1f5f9; color: #64748b;">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h1 class="profile-name">Oops!</h1>
            <p class="profile-bio">${message}</p>
            <a href="/" class="cta-button" style="background: #1e293b; color: white; display: inline-block; padding: 16px 40px; border-radius: 50px; text-decoration: none;">Go Home</a>
        </div>
    `;
}

// Escape attribute
function escapeAttr(text) {
    if (!text) return '';
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
