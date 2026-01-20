# Jason Leonard – Personal Portfolio Website

A responsive personal portfolio website showcasing my software and web development projects, including real-world backend integrations and live production data.

🔗 **Live site:** https://YOUR-NETLIFY-URL  
🔗 **Source code:** https://github.com/jason1511/my-own-website

---

## Overview

This website was designed and built from scratch using semantic HTML, modern CSS, and vanilla JavaScript.  
It goes beyond a static portfolio by integrating **serverless backend features** using Netlify.

The goal of this project is to demonstrate **end-to-end development**, including frontend design, backend logic, API integration, and deployment.

---

## Features

### Frontend
- Semantic, accessible HTML structure
- Responsive layout using modern CSS
- Clean, framework-free JavaScript
- Reusable layout and component patterns

### Backend (Serverless)
- **Contact form backend** using Netlify Forms  
  - AJAX submission  
  - Spam protection (honeypot)
- **Live GitHub repository statistics**  
  - Stars, forks, last updated date  
  - Fetched via GitHub REST API
- **Live Steam Workshop statistics**  
  - Views, subscribers, favourites  
  - Fetched via Steam Web API
- Serverless API proxy via Netlify Functions
- Cached responses for performance and rate-limit safety

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Backend:** Netlify Functions (Node.js, serverless)
- **APIs:** GitHub REST API, Steam Workshop API
- **Hosting & CI/CD:** Netlify
- **Version Control:** GitHub

---

## Project Structure

```text
my-own-website/
├── css/
│   └── style.css
├── js/
│   └── main.js
├── netlify/
│   └── functions/
│       ├── github-repo-stats.js
│       └── workshop-stats.js
├── index.html
├── projects.html
├── about.html
├── contact.html
├── bike-store.html
└── README.md
