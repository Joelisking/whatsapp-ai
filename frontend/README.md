# WhatsApp AI Chatbot - Frontend

Next.js 15 admin dashboard for managing the WhatsApp AI chatbot.

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - API client
- **Lucide React** - Icons
- **date-fns** - Date formatting

## Features

- **Dashboard**: Overview and analytics
- **Product Management**: CRUD operations for inventory
- **Order Management**: View and update orders
- **Customer Management**: View customer data
- **Conversation Management**: Monitor and respond to chats
- **Analytics**: Business metrics and insights

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── products/page.tsx     # Products page
│   │   │   ├── orders/page.tsx       # Orders page
│   │   │   ├── customers/page.tsx    # Customers page
│   │   │   ├── conversations/page.tsx # Conversations page
│   │   │   └── analytics/page.tsx    # Analytics page
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── DashboardLayout.tsx       # Main layout
│   ├── lib/
│   │   └── api.ts                    # API client
│   └── store/
│       └── authStore.ts              # Auth state
└── package.json
```

## Development

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for production
```bash
npm run build
```

### Run production build
```bash
npm start
```

## Pages

### Login (`/login`)
Admin login page

### Register (`/register`)
Create admin account

### Dashboard (`/dashboard`)
- Key metrics
- Order status breakdown
- Popular products
- Low stock alerts

### Products (`/dashboard/products`)
- View all products
- Add/edit/delete products
- Manage stock levels

### Orders (`/dashboard/orders`)
- View all orders
- Update order status
- Add tracking numbers
- View order details

### Customers (`/dashboard/customers`)
- View customer list
- Search customers
- View customer details

### Conversations (`/dashboard/conversations`)
- View active conversations
- Read message history
- Send messages manually
- Take over from AI

### Analytics (`/dashboard/analytics`)
- Revenue metrics
- Order statistics
- Message activity
- Top products

## Styling

This project uses Tailwind CSS with custom components defined in `globals.css`:

- `.btn` - Button base class
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.btn-danger` - Danger button
- `.card` - Card container
- `.input` - Form input
- `.label` - Form label

## State Management

Authentication state is managed with Zustand in `authStore.ts`:

```typescript
const { user, login, logout, isAuthenticated } = useAuthStore();
```

## API Integration

All API calls are centralized in `lib/api.ts`:

```typescript
import { productsAPI, ordersAPI, customersAPI } from '@/lib/api';

// Example usage
const products = await productsAPI.getAll();
const order = await ordersAPI.getById(orderId);
```

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Or connect your GitHub repository to Vercel for automatic deployments.

### Other Platforms

Build and serve the `.next` folder:

```bash
npm run build
npm start
```
