# Email Marketer - MailChimp-like Email Marketing App

A complete email marketing web application with contact management, lists, templates, campaigns, and Mailgun integration. Built with Editor.js block-based editor.

## Features

- 👥 **Contacts** - Manage contacts with tags and search/filter
- 📋 **Lists** - Create contact lists with subscriber management
- 📝 **Templates** - Block-based email designer with Editor.js (headers, lists, images, quotes, code blocks, tables)
- 🚀 **Campaigns** - Template-based email campaigns via Mailgun
- 📊 **Dashboard** - Stats, recent campaigns, delivery tracking
- 🖼️ **Images** - Upload and embed images in emails
- ⚙️ **Settings** - Mailgun API configuration and dark mode
- 📱 **Responsive** - Works on desktop and mobile

## Quick Start

### Local Development

```bash
cd projects/email-marketer

# Install dependencies
npm install

# Start the server
npm start

# App runs at http://localhost:3080
```

### Docker Deployment

```bash
# Build and start with docker-compose
cd projects/email-marketer
docker-compose up -d

# Or use npm scripts
npm run docker:build
npm run docker:up

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

## Docker Configuration

### Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Mailgun Configuration (optional - can also be set via UI)
MAILGUN_API_KEY=your-mailgun-api-key-here
MAILGUN_DOMAIN=mg.yourdomain.com

# Server Configuration
PORT=3080
NODE_ENV=production
```

### Volumes

Docker Compose mounts these volumes for persistence:

- `./data` - SQLite database
- `./public/uploads` - Uploaded images

### Ports

- `3080` - Web application

### Docker Commands

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Shell into container
docker-compose exec email-marketer sh

# Restart
docker-compose restart

# Stop and remove
docker-compose down

# Stop and remove with volumes
docker-compose down -v
```

## Editor.js Blocks

The email editor supports these block types:

| Block | Description |
|-------|-------------|
| **Header** | H1-H6 headings |
| **Paragraph** | Rich text with formatting |
| **List** | Bulleted and numbered lists |
| **Quote** | Blockquotes with captions |
| **Image** | Upload or embed images |
| **Code** | Code blocks |
| **Table** | Data tables |
| **Delimiter** | Horizontal rules |
| **Raw HTML** | Custom HTML insertion |

### Keyboard Shortcuts

- `/` - Open block menu
- `CMD/CTRL + Shift + H` - Header
- `CMD/CTRL + Shift + L` - List
- `CMD/CTRL + Shift + O` - Quote
- `CMD/CTRL + Shift + C` - Code
- `CMD/CTRL + Shift + D` - Delimiter

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/stats | Get dashboard stats |
| GET | /api/contacts | List contacts |
| POST | /api/contacts | Create contact |
| GET | /api/contacts/:id | Get contact |
| PUT | /api/contacts/:id | Update contact |
| DELETE | /api/contacts/:id | Delete contact |
| GET | /api/lists | List lists |
| POST | /api/lists | Create list |
| GET | /api/lists/:id | Get list with contacts |
| PUT | /api/lists/:id | Update list |
| DELETE | /api/lists/:id | Delete list |
| POST | /api/lists/:id/contacts | Add contact to list |
| DELETE | /api/lists/:id/contacts/:contactId | Remove contact from list |
| GET | /api/templates | List templates |
| POST | /api/templates | Create template |
| GET | /api/templates/:id | Get template |
| PUT | /api/templates/:id | Update template |
| DELETE | /api/templates/:id | Delete template |
| GET | /api/campaigns | List campaigns |
| POST | /api/campaigns | Create campaign |
| GET | /api/campaigns/:id | Get campaign |
| PUT | /api/campaigns/:id | Update campaign |
| POST | /api/campaigns/:id/send | Send campaign |
| DELETE | /api/campaigns/:id | Delete campaign |
| POST | /api/upload-image | Upload image |
| POST | /api/fetch-image | Fetch external image |
| GET | /api/settings | Get settings |
| POST | /api/settings | Save settings |
| POST | /api/webhooks/mailgun | Mailgun webhooks |

## Testing

### Run all tests:
```bash
npm test
```

### Run API integration tests:
```bash
npm run test:api
```

### Run E2E tests (Playwright):
```bash
npm run test:e2e
```

## Project Structure

```
email-marketer/
├── server.js              # Express API server
├── database.js            # SQLite database operations
├── Dockerfile             # Docker image definition
├── docker-compose.yml     # Docker Compose configuration
├── .env.example           # Environment variables template
├── .dockerignore          # Docker build exclusions
├── package.json           # Dependencies and scripts
├── jest.config.js         # Jest configuration
├── data/                  # SQLite database (mounted volume)
├── public/
│   ├── uploads/           # Uploaded images (mounted volume)
│   ├── index.html         # Single-page app
│   ├── css/
│   │   └── style.css      # Styling with dark mode
│   └── js/
│       ├── app.js         # Frontend logic
│       └── editor.js      # Editor.js integration
└── tests/
    ├── integration/
    │   └── api.test.js    # API tests
    └── e2e/
        └── full-suite.test.js  # E2E tests
```

## Mailgun Setup

1. Sign up at [Mailgun](https://www.mailgun.com/)
2. Get your API key from the dashboard
3. Add your domain (or use the sandbox domain)
4. Go to Settings in the app
5. Enter API key and domain
6. Verify domain (for production)
7. Send a test campaign!

## Merge Tags

Available merge tags in templates:
- `{{email}}` - Recipient email address
- `{{name}}` - Recipient name
- `{{tag:tagname}}` - Specific contact tag value

## Production Deployment

### With Docker Compose:

```yaml
version: '3.8'

services:
  email-marketer:
    build: .
    restart: always
    ports:
      - "3080:3080"
    volumes:
      - ./data:/app/data
      - ./public/uploads:/app/public/uploads
    environment:
      - NODE_ENV=production
      - MAILGUN_API_KEY=${MAILGUN_API_KEY}
      - MAILGUN_DOMAIN=${MAILGUN_DOMAIN}
```

### With Reverse Proxy (Nginx):

```nginx
server {
    listen 80;
    server_name email.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Developer Notes

### Common Issues & Solutions

#### Authentication Not Working in UI
**Symptom:** API works with curl but UI shows empty data or features don't work.
**Cause:** Frontend fetch calls not sending auth token.
**Fix:** Ensure all API calls use `authFetch()` instead of `fetch()`:
```javascript
// ❌ Wrong
const response = await fetch(`${API_BASE}/api/lists`);

// ✅ Correct
const response = await authFetch(`${API_BASE}/api/lists`);
```

#### Testing Checklist
Before declaring a feature complete:
- [ ] Test through the actual UI (not just API)
- [ ] Test with a fresh user account
- [ ] Test after page refresh
- [ ] Run the full test suite: `npm run test:api`

## License

MIT
