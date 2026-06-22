-- seed.sql
-- Initial data for Jason Leonard portfolio website

DELETE FROM projects;
DELETE FROM workshop_items;

-- Featured projects
INSERT INTO projects (
  title,
  slug,
  summary,
  body,
  type,
  tech_stack,
  github_url,
  live_url,
  image_key,
  is_featured,
  is_published,
  display_order
) VALUES
(
  'Bike Store Inventory & Sales Management App',
  'bike-store',
  'A desktop application built for a small electric bike retailer to manage inventory, sales transactions, and reporting.',
  'A C# and SQLite desktop application designed to support daily business operations for a small electric bike retailer. The app focuses on inventory tracking, transaction logging, service records, offline-first storage, and practical usability for non-technical users.',
  'desktop-app',
  'C#, .NET WinForms, SQLite',
  'https://github.com/jason1511/Bike-STore-Project',
  '',
  '',
  1,
  1,
  1
),
(
  'Personal Portfolio Website',
  'personal-portfolio',
  'A responsive portfolio website built from scratch using semantic HTML, CSS, JavaScript, and Cloudflare backend functions.',
  'A multi-page personal portfolio website built to showcase software and web development projects. The site includes serverless backend features using Cloudflare Pages Functions, live GitHub repository statistics, live Steam Workshop statistics, and a contact backend.',
  'web-app',
  'HTML, CSS, JavaScript, Cloudflare Pages Functions, D1, R2',
  'https://github.com/jason1511/my-own-website',
  '',
  '',
  1,
  1,
  2
);

-- Steam Workshop / hobby items
INSERT INTO workshop_items (
  steam_id,
  title,
  game,
  description,
  workshop_url,
  display_order,
  is_published
) VALUES
(
  '3492276585',
  'KAI CC 206 Re(Logo) Indonesia',
  'Transport Fever 2',
  'Indonesian locomotive reskin/livery work for Transport Fever 2.',
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3492276585',
  1,
  1
),
(
  '3621865519',
  'Kereta Mild Steel Livery 2014–2025 (Narrow Gauge 1067)',
  'Transport Fever 2',
  'Livery pack for KAI mild steel cars on narrow gauge 1067.',
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3621865519',
  2,
  1
),
(
  '3649155955',
  'KAI Kereta Stainless Steel 2018',
  'Transport Fever 2',
  'Stainless steel rolling stock themed for KAI.',
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3649155955',
  3,
  1
),
(
  '3654483140',
  'Additional Transport Fever 2 Workshop Mod',
  'Transport Fever 2',
  'Additional Indonesian railway-related Transport Fever 2 Workshop item.',
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3654483140',
  4,
  1
),
(
  '2271009083',
  'Pindad SS2 temp RHS compat',
  'Arma 3',
  'Compatibility addon enabling RHS magazines and scopes for the BWI SS2 rifle mod.',
  'https://steamcommunity.com/sharedfiles/filedetails/?id=2271009083',
  5,
  1
),
(
  '1687587803',
  'JOS Tentara Nasional Indonesia (Contributor)',
  'Arma 3',
  'Team mod contribution representing Indonesia’s armed forces content for Arma 3.',
  'https://steamcommunity.com/sharedfiles/filedetails/?id=1687587803',
  6,
  1
);