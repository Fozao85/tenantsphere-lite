# Tenantsphere Lite - WhatsApp-First Rental System

A WhatsApp-powered rental experience for users in Buea, Cameroon. Users can discover available rental units, book tours, and get real-time updates through WhatsApp, while agents can easily manage property listings.

## 🎯 Features

### For Tenants (via WhatsApp)
- 💬 Discover available rental units through WhatsApp
- 📋 View detailed property information
- 📅 Book property tours
- ✅ Get instant confirmations
- 🔔 Receive notifications for new matching properties
- ❌ Automatic filtering of already-taken units

### For Agents
- 🏢 Simple property listing management
- 📊 Track property status and bookings
- 👥 Manage tenant interactions
- 📈 View booking analytics

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   Tenantsphere   │    │    Firebase     │
│   Business API  │◄──►│   Backend        │◄──►│    Database     │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Augment AI     │
                       │   Bot Logic      │
                       └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Firebase account
- WhatsApp Business API access
- Cloudinary account (for image hosting)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tenantsphere-lite
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your actual configuration values
```

4. Start the development server:
```bash
npm run dev
```

## 📁 Project Structure

```
tenantsphere-lite/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   └── server.js        # Main server file
├── tests/               # Test files
├── docs/                # Documentation
└── scripts/             # Utility scripts
```

## 🔧 Configuration

See `.env.example` for all required environment variables.

## 📚 API Documentation

API documentation will be available at `/api/docs` when the server is running.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🚀 Deployment

Deployment instructions will be added as the project progresses.

## 📄 License

MIT License - see LICENSE file for details.
