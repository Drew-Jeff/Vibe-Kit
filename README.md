# Vibe-Kit
A automatic website builder based on vibe and color choices


***

```markdown
# 🎨 VibeKit Studio

**Full Stack Vibe Coder Intern Assessment - Purple Merit**
**Candidate:** Drew Jeff
**Date:** March 2026

VibeKit Studio is a full-stack web application that allows users to generate a design theme ("vibe"), apply it to a mini-site, and publish it to a fast, responsive public URL. 

## 🚀 Live Links
* **Deployed Application:** [Insert your Netlify Live URL here]
* **GitHub Repository:** [https://github.com/Drew-Jeff/Vibe-Kit](https://github.com/Drew-Jeff/Vibe-Kit)

## 🔑 Test Credentials
To evaluate the dashboard and page builder functionality without creating a new account, use the following test credentials:
* **Email:** test@purplemerit.com
* **Password:** VibeCoder2026!

## ⚙️ Local Setup Instructions

Follow these steps to run the VibeKit Studio MVP locally on your machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/Drew-Jeff/Vibe-Kit.git](https://github.com/Drew-Jeff/Vibe-Kit.git)
cd Vibe-Kit
```

### 2. Frontend Setup (⚠️ IMPORTANT)
Due to file size constraints and bundling, the frontend assets are compressed. 
> **CRITICAL STEP:** Navigate to the `frontend` directory and unzip the provided zip file directly into the same location before attempting to run the application.

```bash
cd frontend
# Unzip the contents here
```
Once unzipped, you can serve the frontend using any local development server (e.g., Live Server extension in VS Code, or `npx serve .`).

### 3. Backend Setup (Flask & PostgreSQL)
Ensure you have Python 3 and PostgreSQL installed and running locally.

```bash
cd ../backend

# Create and activate a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install required dependencies
pip install -r requirements.txt
```

Set up your local PostgreSQL database (e.g., named `vibekit`) and run the database initialization script to generate the tables.

### 4. Start the Backend Server
```bash
flask run
```
The API will be available at `http://localhost:5000`.

## 🔐 Environment Variables Required
Create a `.env` file in the root `backend` directory and add the following variables. Do not commit this file.

```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://username:password@localhost:5432/vibekit"

# Secret key for signing JWTs
JWT_SECRET="your_super_secret_jwt_string"
```

## ⚖️ Tradeoffs + What I'd Improve Next
1. **CSS Variables vs. CSS-in-JS:** I chose to use vanilla CSS variables (design tokens) for the theme engine to ensure the published pages load instantly without heavy client-side JS overhead. This trades off some developer ergonomics for raw performance.
2. **PostgreSQL vs. NoSQL:** I opted for a relational database to ensure strict data integrity between Users, Pages, and Views, though a NoSQL solution (like MongoDB) might have offered slightly faster initial iteration for the flexible, unstructured page section data.
3. **Draft/Publish Architecture:** Currently, the "published" state is a simple boolean flag on the page record. For a production-ready system, I would improve this by creating a separate `published_pages` table or utilizing a caching layer (like Redis) to ensure the live public URLs serve instantly under high traffic.
4. **Image Handling:** The current gallery section relies on external URLs to keep the MVP lightweight. A future improvement would be integrating an AWS S3 bucket or Cloudinary for direct image uploads, resizing, and automatic optimization.
5. **Analytics Engine:** The view counter is a simple integer increment. In a future iteration, I would implement an event-driven architecture to capture more granular analytics (unique visitors, session duration) without locking the main database tables during high concurrent traffic spikes.
```
