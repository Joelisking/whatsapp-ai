# WhatsApp AI Chatbot for Business

A complete WhatsApp AI chatbot system that enables businesses to automate customer conversations, manage inventory, process orders, and handle payments through WhatsApp.

## Features

### Core Features
- **AI-Powered Conversations**: Natural language conversations powered by Claude (Anthropic)
- **Inventory Management**: Real-time product catalog with stock tracking
- **Order Processing**: Complete order lifecycle from inquiry to delivery
- **Payment Integration**: Secure payment processing with Stripe and Paystack (Ghana)
- **Chat History**: Persistent conversation history and context management
- **Admin Dashboard**: Comprehensive web interface for managing everything

### Advanced Features
- **Human Handoff**: Seamlessly escalate conversations to human agents
- **Multi-language Support**: Configure customer language preferences
- **Analytics Dashboard**: Track orders, revenue, and customer metrics
- **Real-time Notifications**: WhatsApp notifications for order updates
- **Rate Limiting**: Protect against spam and abuse
- **Session Management**: Redis-based conversation context caching

## Tech Stack

### Backend
- **Node.js** + **TypeScript**
- **Express.js** - REST API framework
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Session and cache management
- **Anthropic Claude** - AI conversation engine
- **WhatsApp Business API** - Direct Meta/Facebook integration
- **Stripe** - Payment processing (International)
- **Paystack** - Payment processing (Ghana, Nigeria, Kenya, South Africa)

### Frontend
- **Next.js 15** - React framework
- **TypeScript**
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - API client

## Project Structure

```
whatsapp-ai/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js pages
│   │   ├── components/     # React components
│   │   ├── lib/           # Utilities and API client
│   │   └── store/         # State management
│   └── package.json
└── package.json            # Root package.json (workspace)
```

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **Redis** (v6 or higher)
4. **Meta Business Account** with WhatsApp Business API access
5. **Anthropic API Key** (Claude)
6. **Stripe Account** (for international payments)
7. **Paystack Account** (for Ghana/Africa payments - optional)

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd whatsapp-ai
```

### 2. Install dependencies

```bash
npm install
```

This will install dependencies for both frontend and backend.

### 3. Set up PostgreSQL

Create a new PostgreSQL database:

```bash
createdb whatsapp_ai
```

### 4. Set up Redis

Make sure Redis is running:

```bash
redis-server
```

Or use Docker:

```bash
docker run -d -p 6379:6379 redis:latest
```

### 5. Configure environment variables

#### Backend (.env)

Create `backend/.env` file:

```bash
cp backend/.env.example backend/.env
```

Update with your credentials:

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_ai

# Redis
REDIS_URL=redis://localhost:6379

# WhatsApp Business API (Meta/Facebook)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_API_VERSION=v21.0
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token

# AI (Claude/Anthropic)
ANTHROPIC_API_KEY=your_anthropic_api_key
AI_MODEL=claude-3-5-sonnet-20241022

# Stripe (International Payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Paystack (Ghana/Africa Payments - Optional)
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=7d
```

#### Frontend (.env)

Create `frontend/.env.local` file:

```bash
cp frontend/.env.example frontend/.env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 6. Set up database

Run Prisma migrations:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### 7. Create admin user

You can create an admin user by registering through the frontend, or manually insert into the database.

## Running the Application

### Development Mode

#### Option 1: Run both frontend and backend together

```bash
npm run dev
```

#### Option 2: Run separately

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### Production Mode

#### Build

```bash
npm run build
```

#### Start

```bash
npm start
```

## Setting up WhatsApp Business API

### 1. Create a Meta Business Account

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add "WhatsApp" product to your app
4. Complete business verification

### 2. Set up WhatsApp Business Account

1. In your Meta App Dashboard, go to WhatsApp → Getting Started
2. Create or connect a WhatsApp Business Account
3. Add a phone number (you'll need a phone number not currently used on WhatsApp)
4. Verify the phone number via SMS

### 3. Get Your Credentials

From the WhatsApp → Getting Started page, copy:
- **Phone Number ID**: Found under "Phone number" section
- **WhatsApp Business Account ID**: In the top of the page
- **Access Token**: Generate a permanent token (Settings → System Users)
- **App Secret**: Found in App Settings → Basic

### 4. Configure Webhook

1. Go to WhatsApp → Configuration
2. Click "Edit" next to "Webhook"
3. Set callback URL: `https://your-domain.com/api/webhook/whatsapp`
4. Set verify token: (create a random string, use same in .env as `WHATSAPP_VERIFY_TOKEN`)
5. Subscribe to webhook fields: `messages`

**For local development**, use ngrok:

```bash
ngrok http 3001
```

Use the ngrok URL: `https://your-ngrok-url.ngrok.io/api/webhook/whatsapp`

### 5. Test Your Setup

Send a message to your WhatsApp Business number and check:
1. Webhook receives the message
2. AI responds automatically
3. Messages appear in admin dashboard

### 6. Production Considerations

For production:
1. Complete Meta Business Verification
2. Add payment method for usage beyond free tier
3. Request increased rate limits if needed
4. Set up proper error monitoring

## Setting up Paystack (For Ghana & African Markets)

The system automatically detects Ghanaian phone numbers (+233 or 0-prefixed) and uses Paystack for payment processing.

### 1. Create a Paystack Account

1. Sign up at [Paystack](https://paystack.com/)
2. Complete business verification
3. Add your bank account for settlements

### 2. Get API Keys

1. Go to Settings → API Keys & Webhooks
2. Copy your:
   - **Secret Key** (starts with `sk_`)
   - **Public Key** (starts with `pk_`)

### 3. Configure Webhooks

1. In Paystack Dashboard, go to Settings → API Keys & Webhooks
2. Set webhook URL: `https://your-domain.com/api/webhook/paystack`
3. Subscribe to events: `charge.success`

### 4. Supported Countries & Currencies

Paystack supports:
- **Ghana** (GHS)
- **Nigeria** (NGN)
- **Kenya** (KES)
- **South Africa** (ZAR)
- International cards (USD, EUR, GBP)

### 5. Payment Detection Logic

The system automatically:
- Detects customer location based on phone number
- Uses **Paystack** for +233 (Ghana) numbers
- Uses **Stripe** for all other international numbers
- Supports mobile money, cards, bank transfers, and USSD

## API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword",
  "name": "Admin User"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

### Products

#### Get all products
```http
GET /api/products
```

#### Create product
```http
POST /api/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Product Name",
  "description": "Product description",
  "price": 99.99,
  "currency": "USD",
  "stock": 100,
  "category": "Electronics"
}
```

### Orders

#### Get all orders
```http
GET /api/orders
Authorization: Bearer <token>
```

#### Update order status
```http
PATCH /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "SHIPPED",
  "trackingNumber": "TRACK123"
}
```

### Conversations

#### Get all conversations
```http
GET /api/conversations
Authorization: Bearer <token>
```

#### Send message to customer
```http
POST /api/conversations/:id/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "How can I help you today?"
}
```

## How It Works

### Customer Journey

1. **Customer Initiates**: Customer sends a WhatsApp message to your business number
2. **AI Responds**: Claude analyzes the message and responds naturally
3. **Product Discovery**: Customer asks about products, AI provides details
4. **Purchase Intent**: When customer wants to buy, AI creates order
5. **Payment**: Customer receives Stripe payment link via WhatsApp
6. **Order Processing**: Admin updates order status in dashboard
7. **Notifications**: Customer receives automatic order updates
8. **Human Handoff**: Complex queries escalated to human agents

### Conversation Flow Example

```
Customer: Hi, do you have laptops?
AI: Hello! Yes, we have several laptops available. We have:
    - MacBook Pro M3 - $1999
    - Dell XPS 15 - $1599
    - HP Spectre x360 - $1299
    Would you like details on any of these?

Customer: Tell me about the MacBook
AI: The MacBook Pro M3 is our premium option:
    - Apple M3 chip
    - 16GB RAM
    - 512GB SSD
    - 14-inch Retina display
    Price: $1999
    Stock: 5 available

    Would you like to purchase this?

Customer: Yes, I want to buy it
AI: Great! I'll create an order for 1x MacBook Pro M3.
    Total: $1999

    [Payment link sent]

    Click the link to complete your secure payment.
```

## Admin Dashboard

Access at `http://localhost:3000/dashboard`

### Features:
- **Dashboard**: Overview of orders, revenue, and metrics
- **Products**: Manage inventory, add/edit/delete products
- **Orders**: View and update order statuses
- **Customers**: View customer information and history
- **Conversations**: Monitor chats and respond manually
- **Analytics**: Track performance metrics

## Deployment

### Backend Deployment (Railway/Heroku)

1. Set environment variables
2. Add PostgreSQL and Redis addons
3. Deploy:

```bash
cd backend
npm run build
```

### Frontend Deployment (Vercel)

```bash
cd frontend
vercel deploy
```

### Environment Variables for Production

Ensure all production environment variables are set, especially:
- `NODE_ENV=production`
- Production database URLs
- Production API keys
- Proper CORS origins

## Troubleshooting

### WhatsApp messages not receiving

- Check Twilio webhook configuration
- Ensure webhook URL is accessible (use ngrok for local testing)
- Verify Twilio credentials in `.env`

### Database connection errors

- Verify PostgreSQL is running
- Check `DATABASE_URL` format
- Ensure database exists

### Redis connection errors

- Verify Redis is running: `redis-cli ping`
- Check `REDIS_URL` in `.env`

### AI responses not working

- Verify `ANTHROPIC_API_KEY` is correct
- Check API quota/limits
- Review logs for specific errors

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** in production
3. **Enable HTTPS** in production
4. **Implement rate limiting** (already configured)
5. **Validate all user inputs** (implemented with Zod)
6. **Use environment-specific configs**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this for your business!

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions
- Review Twilio/Anthropic/Stripe documentation

## Acknowledgments

- Built with [Anthropic Claude](https://www.anthropic.com/)
- WhatsApp integration via [Twilio](https://www.twilio.com/)
- Payment processing by [Stripe](https://stripe.com/)
