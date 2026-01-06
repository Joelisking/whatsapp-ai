# Multi-Tenant Migration - Completion Checklist

## ✅ Completed

- [x] Database schema transformed to multi-tenant
- [x] Business model with all configurations
- [x] Business context middleware created
- [x] Multi-tenant WhatsApp service
- [x] Business onboarding API
- [x] Auth middleware updated for businessId
- [x] Business routes added to server
- [x] Settings routes removed (now part of Business)
- [x] Multi-tenant owner notification service created
- [x] Comprehensive documentation written

## 🔧 Remaining Updates

### 1. Auth Controller (`src/controllers/auth.controller.ts`)

**Line 17 & 65** - Update user lookup:
```typescript
// OLD
const user = await prisma.user.findUnique({
  where: { email }
});

// NEW - Need businessId or use different approach
const user = await prisma.user.findFirst({
  where: { email },
  include: { business: true }
});
```

**Line 75** - Add businessId to registration:
```typescript
// Registration needs to specify which business
const user = await prisma.user.create({
  data: {
    businessId: req.body.businessId, // Or get from context
    email,
    password: hashedPassword,
    name,
  }
});
```

**JWT Token** - Include businessId:
```typescript
const token = jwt.sign({
  id: user.id,
  email: user.email,
  role: user.role,
  businessId: user.businessId, // ADD THIS
}, config.jwt.secret);
```

### 2. Chatbot Controller (`src/controllers/chatbot.controller.ts`)

Add business context throughout. Use the middleware:

```typescript
import { identifyBusinessFromWhatsApp, BusinessRequest } from '../middleware/businessContext';

export async function handleIncomingMessage(req: BusinessRequest, res: Response) {
  const businessId = req.business!.id;

  // Line 43 - Find customer by business
  let customer = await prisma.customer.findUnique({
    where: {
      businessId_phoneNumber: {
        businessId,
        phoneNumber,
      }
    }
  });

  // Line 48 - Create customer with businessId
  customer = await prisma.customer.create({
    data: {
      businessId,
      phoneNumber,
      name,
    }
  });

  // Line 70 - Create conversation with businessId
  conversation = await prisma.conversation.create({
    data: {
      businessId,
      customerId: customer.id,
      status: 'ACTIVE',
    },
    include: { messages: true }
  });

  // Line 269 - Create order with businessId
  const order = await prisma.order.create({
    data: {
      businessId,
      customerId: customer!.id,
      orderNumber,
      // ... rest
    }
  });

  // Use business-specific WhatsApp config
  const whatsappConfig = {
    accessToken: req.business!.whatsappAccessToken,
    phoneNumberId: req.business!.whatsappPhoneId,
  };

  await sendWhatsAppMessage(whatsappConfig, { ... });
}
```

### 3. Product Controller (`src/controllers/product.controller.ts`)

**Line 72** - Add businessId to product creation:
```typescript
const product = await prisma.product.create({
  data: {
    businessId: req.user!.businessId,
    name,
    description,
    price,
    currency,
    stock,
    category,
    imageUrl,
    metadata,
  }
});
```

**All queries** - Filter by businessId:
```typescript
const products = await prisma.product.findMany({
  where: { businessId: req.user!.businessId, isActive: true }
});
```

### 4. Webhook Controller (`src/controllers/webhook.controller.ts`)

Update to use business-specific Paystack:

```typescript
import { BusinessRequest, identifyBusinessFromWhatsApp } from '../middleware/businessContext';

// Use business's Paystack keys
const paystackClient = axios.create({
  baseURL: 'https://api.paystack.co',
  headers: {
    'Authorization': `Bearer ${req.business!.paystackSecretKey}`,
  }
});

// Update notifications
await notifyPaymentSuccess(req.business!.id, orderId);
await notifyPaymentFailed(req.business!.id, orderId, reason);
```

### 5. AI Service (`src/services/ai.service.ts`)

Update to load products per business:

```typescript
export async function generateAIResponse(
  businessId: string,  // ADD THIS
  userMessage: string,
  context: ConversationContext
): Promise<string> {
  // Get products for THIS business only
  const products = await prisma.product.findMany({
    where: {
      businessId,  // Filter by business
      isActive: true
    },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      stock: true,
      category: true,
    },
  });

  // Rest of function...
}
```

### 6. Order/Customer/Conversation Controllers

Same pattern - filter all queries:

```typescript
// Add to ALL findMany queries
where: {
  businessId: req.user!.businessId,
  // ... other conditions
}
```

### 7. Cron Service (Remove initializeSettings)

```typescript
// Remove this line from cron.service.ts:11
// initializeSettings(); // DELETE THIS

// Or update to initialize businesses
export function initializeCronJobs(): void {
  // Schedule daily payout notification (runs at 6 PM every day)
  dailyPayoutJob = cron.schedule('0 18 * * *', async () => {
    logger.info('Running daily payout notification job...');
    try {
      // Get all active businesses
      const businesses = await prisma.business.findMany({
        where: { status: 'ACTIVE' }
      });

      // Send payout for each business
      for (const business of businesses) {
        await sendDailyPayoutNotification(business.id);
      }
    } catch (error) {
      logger.error('Daily payout job failed:', error);
    }
  });
}
```

### 8. Payout Service

Update to accept businessId:

```typescript
export async function calculateDailyPayout(
  businessId: string,  // ADD THIS
  date?: Date
): Promise<DailyPayoutSummary> {
  const orders = await prisma.order.findMany({
    where: {
      businessId,  // Filter by business
      createdAt: { gte: startOfDay, lte: endOfDay }
    },
    // ... rest
  });
}

export async function sendDailyPayoutNotification(
  businessId: string  // ADD THIS
): Promise<void> {
  const summary = await calculateDailyPayout(businessId, yesterday);
  await notifyOwner(businessId, { ... });
}
```

## 📝 Quick Reference: Common Patterns

### Pattern 1: API Routes with Auth
```typescript
router.get('/', authenticate, identifyBusinessFromUser, async (req: BusinessRequest, res) => {
  const businessId = req.business!.id;
  const data = await prisma.model.findMany({
    where: { businessId }
  });
  res.json(data);
});
```

### Pattern 2: WhatsApp Webhooks
```typescript
router.post('/webhook', identifyBusinessFromWhatsApp, async (req: BusinessRequest, res) => {
  const business = req.business!;

  const whatsappConfig = {
    accessToken: business.whatsappAccessToken,
    phoneNumberId: business.whatsappPhoneId,
  };

  await sendWhatsAppMessage(whatsappConfig, { ... });
});
```

### Pattern 3: Composite Unique Keys
```typescript
// Finding by phone in multi-tenant
const customer = await prisma.customer.findUnique({
  where: {
    businessId_phoneNumber: {
      businessId: 'uuid',
      phoneNumber: '+233...',
    }
  }
});
```

## 🚀 Testing Multi-Tenant System

### 1. Create First Business
```bash
curl -X POST http://localhost:5000/api/businesses \
  -H "Content-Type: application/json" \
  -d @first-business.json
```

### 2. Login as Business Owner
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -d '{"email":"owner@test.com","password":"SecurePass123!"}'
```

### 3. Create Products
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"Product 1","price":50,"stock":10}'
```

### 4. Test WhatsApp Integration
Send message to business WhatsApp number, verify:
- Business is identified correctly
- Only that business's products shown
- Orders created with correct businessId

### 5. Create Second Business
Repeat steps 1-4 with different data, verify complete isolation.

## ⚡ Shortcuts

### Quick Fix: Single Business Mode
Create one business, hard-code its ID:

```typescript
// Temporary: Hard-code business ID
const BUSINESS_ID = 'your-business-uuid-here';

// Use everywhere instead of req.business!.id
const products = await prisma.product.findMany({
  where: { businessId: BUSINESS_ID }
});
```

### Skip Auth for Testing
```typescript
// Temporarily bypass business context
router.get('/test', async (req, res) => {
  const business = await prisma.business.findFirst();
  // Use business.id for testing
});
```

## 📊 Estimated Time

- Update all controllers: **2-3 hours**
- Update all services: **1-2 hours**
- Testing: **1 hour**
- **Total: 4-6 hours**

## 🎯 Priority Order

1. **High Priority** (System works):
   - Auth controller (login/register)
   - Chatbot controller (core functionality)
   - Product controller (data management)

2. **Medium Priority** (Full features):
   - Webhook controller (payments)
   - AI service (product context)
   - Payout service (reporting)

3. **Low Priority** (Nice to have):
   - Analytics
   - Advanced features

---

**The architecture is solid. The updates are mechanical. Follow the patterns above and you'll have a working multi-tenant system!** 🚀
