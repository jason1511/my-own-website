# Jason Leonard — Personal Portfolio

A responsive portfolio and lightweight content-management system for my software, web and modding projects.

**Live site:** https://jasonportofolio.pages.dev/  
**Repository:** https://github.com/jason1511/my-own-website

## Overview

The site began as a static HTML, CSS and JavaScript portfolio and now includes a serverless backend built with Cloudflare Pages Functions and D1.

It demonstrates end-to-end development across responsive interfaces, REST-style APIs, database-backed content, external integrations, administration workflows and Git-based deployment.

## Current features

### Public portfolio

- Responsive multi-page layout
- Dynamic project listings and featured projects
- Reusable project and case-study detail pages
- Published blog and Steam Workshop content
- GitHub repository statistics
- Steam Workshop statistics
- Contact form backend
- Graceful fallbacks when an API or database request is unavailable

### Admin content management

The protected admin page supports creating, editing and deleting:

- Portfolio projects
- Project case studies
- Blog posts
- Steam Workshop items
- R2-hosted images through a reusable media library

Content can be published or kept as a draft, featured and arranged using display order.

### Visual case-study builder

Case studies support:

- A linked portfolio project
- Summary and technology fields
- Role, project type, intended users, platform, status and timeline
- Cover image paths or URLs with required alt text
- Ordered content sections
- Paragraphs, bullet points, screenshots, captions and alt text
- Move-up, move-down and remove controls
- Automatically generated table of contents
- Legacy problem, solution, features, technical details, challenges and learnings fields

Projects also support an ordered screenshot gallery. Every image field can upload a new image, accept a pasted screenshot, or choose an existing asset from the R2 Media library.

### Backend and data

- Cloudflare Pages Functions
- Cloudflare D1 database
- Cloudflare R2 object storage
- Public and protected admin API routes
- Signed, HTTP-only admin sessions
- Server-side input validation
- Published-content filtering
- GitHub REST API and Steam Web API integrations
- Optional Resend-backed contact delivery

## Tech stack

- HTML5
- CSS3
- Vanilla JavaScript
- Cloudflare Pages
- Cloudflare Pages Functions
- Cloudflare D1
- Cloudflare R2
- Wrangler
- GitHub REST API
- Steam Web API

## Project structure

~~~text
my-own-website/
├── css/
├── functions/
│   └── api/
│       ├── admin/
│       ├── case-studies/
│       └── contact.js
├── js/
├── migrations/
│   ├── 0001_case_studies.sql
│   └── 0002_expand_case_studies.sql
├── admin.html
├── case-study.html
├── index.html
├── projects.html
├── schema.sql
└── wrangler.toml
~~~

## Local development

Install Node.js, then run the site through Wrangler:

~~~bash
npx wrangler pages dev .
~~~

Running HTML files directly is sufficient for static layout work, but API routes and D1-backed content require Wrangler.

## D1 setup

The D1 binding is named **DB** and is configured in wrangler.toml.

For a new local database, initialise it from schema.sql. Existing databases should receive migrations in numerical order. Migration 0002 adds the expanded visual case-study fields, and migration 0003 adds ordered project screenshot galleries.

Before deploying an API change that depends on a migration, apply that migration to the remote D1 database and smoke-test both the admin and public pages.

## Environment variables

Configure these through Cloudflare rather than committing secrets:

- **ADMIN_PASSWORD** — protects admin API routes
- **GITHUB_TOKEN** — optional authenticated GitHub API access
- **RESEND_API_KEY** — optional contact-email delivery
- **CONTACT_TO_EMAIL** — contact-form destination

## R2 media setup

Create an R2 bucket in Cloudflare and bind it to the Pages project using the variable name **MEDIA_BUCKET**. The binding must be available to both preview and production if image uploads should work in both environments. Redeploy the Pages project after adding or changing the binding.

The Admin Media page accepts uploaded or clipboard-pasted JPG, PNG, WebP, GIF and AVIF images up to 5 MB. Uploaded files are delivered through `/media/:key`, so the R2 bucket itself does not need public access or a custom R2 domain.

## Deployment

The repository's default branch is **main**. Pushes to main are deployed through the connected Cloudflare Pages project.

Database migrations are separate from the Git deployment and must be applied to the target D1 database when required.

## Related project

### Bike Store Inventory & Sales Management App

A C#/.NET 8 WinForms and SQLite application for inventory, FIFO stock lots, sales, service records, user management and reporting.

https://github.com/jason1511/Bike-STore-Project

## Author

**Jason Leonard**

- GitHub: https://github.com/jason1511
- LinkedIn: https://www.linkedin.com/in/jason-leonard-197230163/

## License

Licensed under the GNU General Public License v3.0. See LICENSE.
