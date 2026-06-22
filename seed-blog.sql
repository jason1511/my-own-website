-- seed-blog.sql
-- First published blog post

INSERT INTO blog_posts (
  title,
  slug,
  excerpt,
  content,
  cover_image_key,
  is_published,
  display_order
) VALUES (
  'Building My Portfolio with Cloudflare Pages, D1, and Functions',
  'building-my-portfolio-cloudflare',
  'A short write-up about turning my personal portfolio into a dynamic site using Cloudflare Pages, D1, and serverless functions.',
  'I started this portfolio as a simple static website built with HTML, CSS, and JavaScript.

As the project grew, I wanted it to show more than layout and styling. I added serverless backend features using Cloudflare Pages Functions, including live GitHub repository statistics and Steam Workshop data.

The next step was moving portfolio content into Cloudflare D1 so projects, workshop entries, and future blog posts can be managed from a database instead of being hardcoded in HTML.

This project helped me practise frontend structure, API integration, serverless backend development, deployment, and working with real production constraints.',
  '',
  1,
  1
);