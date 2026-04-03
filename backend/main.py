import os
import json
import secrets
import hashlib
import asyncio
from datetime import datetime, timedelta
from functools import wraps

import asyncpg
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS

app = Flask(__name__)
CORS(app, supports_credentials=True)

# JWT secret
JWT_SECRET = os.environ.get("JWT_SECRET", "vibekit-secret-key-change-in-production")

# Database pool
pool = None

def get_event_loop():
    try:
        return asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop

async def get_pool():
    global pool
    if pool is None:
        pool = await asyncpg.create_pool(dsn=os.environ.get("DATABASE_URL"))
    return pool

def run_async(coro):
    loop = get_event_loop()
    return loop.run_until_complete(coro)

# Simple JWT implementation
def create_token(user_id, email):
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": (datetime.utcnow() + timedelta(days=7)).isoformat()
    }
    data = json.dumps(payload)
    signature = hashlib.sha256((data + JWT_SECRET).encode()).hexdigest()
    return f"{data}|{signature}"

def verify_token(token):
    try:
        data, signature = token.rsplit("|", 1)
        expected_sig = hashlib.sha256((data + JWT_SECRET).encode()).hexdigest()
        if signature != expected_sig:
            return None
        payload = json.loads(data)
        exp = datetime.fromisoformat(payload["exp"])
        if datetime.utcnow() > exp:
            return None
        return payload
    except:
        return None

def hash_password(password):
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}:{hashed.hex()}"

def verify_password(password, stored):
    try:
        salt, hashed = stored.split(":")
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return new_hash.hex() == hashed
    except:
        return False

def auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get("auth_token")
        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]
        
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        request.user = payload
        return f(*args, **kwargs)
    return decorated

# Health check
@app.get("/health")
def health():
    return jsonify({"status": "ok"})

# Auth endpoints
@app.post("/auth/register")
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not username or not email or not password:
        return jsonify({"error": "Username, email and password required"}), 400
    
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    async def create_user():
        p = await get_pool()
        
        # Check if user exists
        existing = await p.fetchrow("SELECT id FROM users WHERE email = $1 OR username = $2", email, username)
        if existing:
            return None, "Email or username already taken"
        
        # Create user
        hashed = hash_password(password)
        row = await p.fetchrow(
            "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email",
            username, email, hashed
        )
        return dict(row), None
    
    user, error = run_async(create_user())
    if error:
        return jsonify({"error": error}), 400
    
    token = create_token(user["id"], user["email"])
    return jsonify({"user": user, "token": token})

@app.post("/auth/login")
def login():
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    async def check_user():
        p = await get_pool()
        row = await p.fetchrow("SELECT id, username, email, password_hash FROM users WHERE email = $1", email)
        return dict(row) if row else None
    
    user = run_async(check_user())
    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401
    
    del user["password_hash"]
    token = create_token(user["id"], user["email"])
    return jsonify({"user": user, "token": token})

@app.post("/auth/logout")
def logout():
    response = make_response(jsonify({"message": "Logged out"}))
    response.delete_cookie("auth_token")
    return response

@app.get("/auth/me")
@auth_required
def me():
    async def get_user():
        p = await get_pool()
        row = await p.fetchrow("SELECT id, username, email FROM users WHERE id = $1", request.user["user_id"])
        return dict(row) if row else None
    
    user = run_async(get_user())
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user})

# Pages endpoints
@app.get("/pages")
@auth_required
def list_pages():
    async def fetch_pages():
        p = await get_pool()
        rows = await p.fetch(
            """SELECT p.id, p.title, p.slug, p.vibe, p.is_published, p.created_at, p.updated_at,
               (SELECT COUNT(*) FROM page_views WHERE page_id = p.id) as view_count
               FROM pages p WHERE p.user_id = $1 ORDER BY p.updated_at DESC""",
            request.user["user_id"]
        )
        return [dict(r) for r in rows]
    
    pages = run_async(fetch_pages())
    return jsonify({"pages": pages})

@app.post("/pages")
@auth_required
def create_page():
    data = request.get_json()
    title = data.get("title", "Untitled Page").strip()
    slug = data.get("slug", "").strip().lower()
    vibe = data.get("vibe", "minimalist")
    
    # Clean slug
    if not slug:
        slug = title.lower().replace(" ", "-")[:50]
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    if not slug:
        slug = "page"
    
    async def create():
        p = await get_pool()
        
        # Handle slug collisions
        original_slug = slug
        counter = 1
        test_slug = slug
        while True:
            existing = await p.fetchrow("SELECT id FROM pages WHERE slug = $1", test_slug)
            if not existing:
                break
            test_slug = f"{original_slug}-{counter}"
            counter += 1
        
        # Default content structure
        content = {
            "name": "",
            "title": "",
            "bio": "",
            "twitter": "",
            "github": "",
            "linkedin": "",
            "website": "",
            "ctaText": "",
            "ctaLink": "",
            "showContact": False
        }
        
        row = await p.fetchrow(
            """INSERT INTO pages (user_id, title, slug, content, vibe, is_published) 
               VALUES ($1, $2, $3, $4, $5, FALSE) 
               RETURNING id, title, slug, content, vibe, is_published, created_at, updated_at""",
            request.user["user_id"], title, test_slug, json.dumps(content), vibe
        )
        result = dict(row)
        result["content"] = json.loads(result["content"])
        return result
    
    page = run_async(create())
    return jsonify({"page": page}), 201

@app.get("/pages/<int:page_id>")
@auth_required
def get_page(page_id):
    async def fetch():
        p = await get_pool()
        row = await p.fetchrow(
            "SELECT * FROM pages WHERE id = $1 AND user_id = $2",
            page_id, request.user["user_id"]
        )
        if row:
            result = dict(row)
            result["content"] = json.loads(result["content"]) if result["content"] else {}
            return result
        return None
    
    page = run_async(fetch())
    if not page:
        return jsonify({"error": "Page not found"}), 404
    return jsonify({"page": page})

@app.put("/pages/<int:page_id>")
@auth_required
def update_page(page_id):
    data = request.get_json()
    
    async def update():
        p = await get_pool()
        
        # Verify ownership
        existing = await p.fetchrow("SELECT id, slug FROM pages WHERE id = $1 AND user_id = $2", page_id, request.user["user_id"])
        if not existing:
            return None, "Page not found"
        
        # Build update query
        updates = []
        values = []
        param_idx = 1
        
        if "title" in data:
            updates.append(f"title = ${param_idx}")
            values.append(data["title"])
            param_idx += 1
        
        if "content" in data:
            updates.append(f"content = ${param_idx}")
            values.append(json.dumps(data["content"]))
            param_idx += 1
        
        if "vibe" in data:
            updates.append(f"vibe = ${param_idx}")
            values.append(data["vibe"])
            param_idx += 1
        
        if "is_published" in data:
            updates.append(f"is_published = ${param_idx}")
            values.append(data["is_published"])
            param_idx += 1
        
        if not updates:
            row = await p.fetchrow("SELECT * FROM pages WHERE id = $1", page_id)
            result = dict(row)
            result["content"] = json.loads(result["content"]) if result["content"] else {}
            return result, None
        
        updates.append("updated_at = NOW()")
        values.append(page_id)
        
        query = f"UPDATE pages SET {', '.join(updates)} WHERE id = ${param_idx} RETURNING *"
        row = await p.fetchrow(query, *values)
        result = dict(row)
        result["content"] = json.loads(result["content"]) if result["content"] else {}
        return result, None
    
    page, error = run_async(update())
    if error:
        return jsonify({"error": error}), 404
    return jsonify({"page": page})

@app.delete("/pages/<int:page_id>")
@auth_required
def delete_page(page_id):
    async def delete():
        p = await get_pool()
        result = await p.execute("DELETE FROM pages WHERE id = $1 AND user_id = $2", page_id, request.user["user_id"])
        return "DELETE 1" in result
    
    deleted = run_async(delete())
    if not deleted:
        return jsonify({"error": "Page not found"}), 404
    return jsonify({"message": "Page deleted"})

# Analytics endpoint
@app.get("/analytics")
@auth_required
def get_analytics():
    async def fetch_analytics():
        p = await get_pool()
        
        # Total pages
        pages_count = await p.fetchval(
            "SELECT COUNT(*) FROM pages WHERE user_id = $1",
            request.user["user_id"]
        )
        
        # Total views
        views_count = await p.fetchval(
            """SELECT COUNT(*) FROM page_views pv 
               JOIN pages p ON pv.page_id = p.id 
               WHERE p.user_id = $1""",
            request.user["user_id"]
        )
        
        # Total submissions
        submissions_count = await p.fetchval(
            """SELECT COUNT(*) FROM contact_submissions cs 
               JOIN pages p ON cs.page_id = p.id 
               WHERE p.user_id = $1""",
            request.user["user_id"]
        )
        
        # Pages with view counts
        pages = await p.fetch(
            """SELECT p.id, p.title, p.slug,
               (SELECT COUNT(*) FROM page_views WHERE page_id = p.id) as view_count
               FROM pages p WHERE p.user_id = $1 ORDER BY view_count DESC""",
            request.user["user_id"]
        )
        
        return {
            "total_pages": pages_count,
            "total_views": views_count,
            "total_submissions": submissions_count,
            "pages": [dict(r) for r in pages]
        }
    
    analytics = run_async(fetch_analytics())
    return jsonify(analytics)

# Submissions endpoint
@app.get("/submissions")
@auth_required
def get_submissions():
    async def fetch_submissions():
        p = await get_pool()
        rows = await p.fetch(
            """SELECT cs.id, cs.name, cs.email, cs.message, cs.submitted_at, p.title as page_title
               FROM contact_submissions cs
               JOIN pages p ON cs.page_id = p.id
               WHERE p.user_id = $1
               ORDER BY cs.submitted_at DESC""",
            request.user["user_id"]
        )
        return [dict(r) for r in rows]
    
    submissions = run_async(fetch_submissions())
    return jsonify({"submissions": submissions})

# Public page endpoint
@app.get("/p/<slug>")
def get_public_page(slug):
    async def fetch():
        p = await get_pool()
        row = await p.fetchrow(
            "SELECT id, title, slug, content, vibe FROM pages WHERE slug = $1 AND is_published = TRUE",
            slug
        )
        if row:
            result = dict(row)
            result["content"] = json.loads(result["content"]) if result["content"] else {}
            
            # Track page view
            await p.execute(
                "INSERT INTO page_views (page_id) VALUES ($1)",
                result["id"]
            )
            return result
        return None
    
    page = run_async(fetch())
    if not page:
        return jsonify({"error": "Page not found"}), 404
    return jsonify({"page": page})

# Contact form submission
@app.post("/contact")
def submit_contact():
    data = request.get_json()
    page_id = data.get("page_id")
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    message = data.get("message", "").strip()
    
    if not page_id or not name or not email or not message:
        return jsonify({"error": "All fields are required"}), 400
    
    async def save_contact():
        p = await get_pool()
        
        # Verify page exists and is published
        page = await p.fetchrow("SELECT id FROM pages WHERE id = $1 AND is_published = TRUE", page_id)
        if not page:
            return False
        
        await p.execute(
            "INSERT INTO contact_submissions (page_id, name, email, message) VALUES ($1, $2, $3, $4)",
            page_id, name, email, message
        )
        return True
    
    success = run_async(save_contact())
    if not success:
        return jsonify({"error": "Page not found"}), 404
    return jsonify({"message": "Message sent successfully"}), 201

if __name__ == "__main__":
    app.run(debug=True, port=8000)
