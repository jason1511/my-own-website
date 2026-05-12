# Jason Leonard – Personal Portfolio Website

A responsive personal portfolio website showcasing my software and web development projects, including real-world backend integrations and live production data.

🔗 **Live site:** https://jasonportofolio.pages.dev/
🔗 **Source code:** https://github.com/jason1511/my-own-website

---

## Overview

This website was designed and built from scratch using semantic HTML, modern CSS, and vanilla JavaScript.

The project evolved from a static portfolio into a production-style web application featuring:

- Serverless backend functions
- External API integrations
- Dynamic live statistics
- Production deployment via Cloudflare Pages

The goal of this project is to demonstrate practical, end-to-end web development skills including frontend implementation, backend logic, deployment, and API integration.

---

## Features

### Frontend
- Semantic and accessible HTML structure
- Responsive multi-page layout
- Reusable CSS components
- Vanilla JavaScript interactivity
- Mobile-friendly navigation and layouts

### Backend (Serverless Functions)
- Contact form backend using Cloudflare Functions
- Live GitHub repository statistics
- Live Steam Workshop statistics
- External API integration and response handling
- Graceful fallback handling when APIs are unavailable

### Dynamic Integrations

#### GitHub REST API
- Repository stars
- Fork counts
- Last updated dates

#### Steam Workshop API
- Subscribers
- Favorites
- Views

---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Cloudflare Pages Functions
- **Hosting:** Cloudflare Pages
- **APIs:** GitHub REST API, Steam Web API
- **Version Control:** GitHub

---

## Project Structure

```text
my-own-website/
├── css/
│   └── style.css
├── js/
│   └── main.js
├── functions/
│   ├── github-repo-stats.js
│   ├── workshop-stats.js
│   └── api/
│       └── contact.js
├── index.html
├── projects.html
├── about.html
├── contact.html
├── bike-store.html
└── README.md
```

---

## Backend Architecture

```text
Browser
  ↓
Cloudflare Pages Functions
  ↓
GitHub API / Steam API
```

External API requests are handled server-side through Cloudflare Functions.

This approach:
- avoids CORS issues
- keeps implementation maintainable
- allows lightweight backend logic without managing a traditional server

---

## Featured Project Sections

### Bike Store Inventory & Sales Management App

A desktop application built using C#, .NET WinForms, and SQLite to support inventory tracking, transactions, and operational workflows for a small electric bike retailer.

### Steam Workshop Projects

Published Transport Fever 2 and Arma 3 Workshop content featuring:
- Indonesian railway liveries
- Asset modifications
- Compatibility addons
- Team-based mod contributions

Live Workshop statistics are fetched dynamically from Steam.

---

## Running Locally

### Frontend only

Open the HTML files directly in a browser.

### Full local development

Cloudflare Pages Functions can be tested locally using Wrangler.

```bash
npm install -g wrangler
wrangler pages dev .
```

---

## Environment Variables

Optional environment variables:

```text
GITHUB_TOKEN=your_github_token
RESEND_API_KEY=your_resend_api_key
CONTACT_TO_EMAIL=your_email@example.com
```

These are configured through the Cloudflare dashboard.

---

## Deployment

This project is deployed using:
- GitHub for version control
- Cloudflare Pages for hosting and serverless backend functions

Pushes to the repository automatically trigger deployment updates.

---

## Related Projects

### Bike Store Inventory & Sales Management App

Desktop application built with:
- C#
- .NET WinForms
- SQLite

🔗 https://github.com/jason1511/Bike-STore-Project

---

## Author

**Jason Leonard**

- GitHub: https://github.com/jason1511
- LinkedIn: https://www.linkedin.com/in/jason-leonard-197230163/

---

## License

This project is licensed under the GPL-3.0 License.
