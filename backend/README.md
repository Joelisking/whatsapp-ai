# WhatsApp AI Chatbot - Backend

Express + TypeScript backend for the WhatsApp AI chatbot system.

## Tech Stack

- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **Redis** - Caching and sessions
- **Twilio** - WhatsApp API
- **Anthropic Claude** - AI
- **Stripe** - Payments

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── index.ts          # Configuration loader
│   │   └── database.ts       # Prisma client
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── chatbot.controller.ts
│   │   ├── product.controller.ts
│   │   ├── order.controller.ts
│   │   ├── customer.controller.ts
│   │   ├── conversation.controller.ts
│   │   └── analytics.controller.ts
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   ├── errorHandler.ts   # Error handling
│   │   └── rateLimiter.ts    # Rate limiting
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── whatsapp.routes.ts
│   │   ├── product.routes.ts
│   │   ├── order.routes.ts
│   │   ├── customer.routes.ts
│   │   ├── conversation.routes.ts
│   │   └── analytics.routes.ts
│   ├── services/
│   │   ├── ai.service.ts         # Claude AI integration
│   │   ├── whatsapp.service.ts   # Twilio WhatsApp
│   │   ├── stripe.service.ts     # Payment processing
│   │   └── redis.service.ts      # Redis operations
│   └── index.ts              # Entry point
├── prisma/
│   └── schema.prisma         # Database schema
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/cancel` - Cancel order

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer
- `PATCH /api/customers/:id` - Update customer

### Conversations
- `GET /api/conversations` - List conversations
- `GET /api/conversations/:id` - Get conversation
- `POST /api/conversations/:id/messages` - Send message
- `PATCH /api/conversations/:id/status` - Update status

### Analytics
- `GET /api/analytics` - Get analytics data

### WhatsApp Webhook
- `POST /api/webhook/whatsapp` - Receive messages
- `POST /api/webhook/whatsapp/status` - Message status

## Database Schema

### Key Models

**User**: Admin users
**Customer**: WhatsApp customers
**Product**: Inventory items
**Order**: Customer orders
**OrderItem**: Order line items
**Conversation**: WhatsApp conversations
**Message**: Individual messages

## Development

### Install dependencies
```bash
npm install
```

### Set up database
```bash
npx prisma generate
npx prisma migrate dev
```

### Run development server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Run production
```bash
npm start
```

## Environment Variables

See `.env.example` for all required variables.

## Testing with Postman/cURL

### Create a product
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 99.99,
    "stock": 10,
    "currency": "USD"
  }'
```

### Simulate WhatsApp message
```bash
curl -X POST http://localhost:3001/api/webhook/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+1234567890&Body=Hello&ProfileName=TestUser&MessageSid=test123"
```
