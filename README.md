# 🧾 Munim

### An AI-assisted commerce and payment workflow for agentic buyers

Munim is an experimental agentic commerce application that makes a traditional merchant **discoverable, understandable, and safely transactable by AI agents**.

The project demonstrates an important principle:

> **AI can understand intent and propose actions, but deterministic systems should control money.**

Munim combines an AI-powered purchasing conversation with strict rule-based logic for inventory, pricing, mandates, payment capture, retries, and auditing.

---

## ✨ The Problem

Traditional merchants may already accept digital payments, but they are often invisible to AI purchasing agents.

An AI agent needs to understand:

- What products a merchant sells
- Product aliases and natural language names
- Available stock
- Prices
- GST
- Substitutions
- Merchant rules
- Payment boundaries

Munim creates an **agent-readable commerce layer** around a merchant while keeping financial actions controlled by deterministic business rules.

---

## 🚀 What Munim Does

### 🛒 AI Counter

An AI-powered counter where a buyer or purchasing agent can:

- Search for products using natural language
- Add products to an order
- Request a quote
- Create a payment mandate
- Capture a payment
- Retry failed payments within defined limits

The AI acts as the conversational interface.

It does **not** control the financial system directly.

---

### 🧠 AI-Powered Product Understanding

The AI understands product information such as:

- Product names
- SKU codes
- Alternative names and aliases
- Product categories
- Stock availability
- Substitution rules
- Merchant-specific product notes

Example:

```text
"thick poha"
"jada poha"
"poha thick"

can all map to the appropriate product SKU.

🏪 Agent-Readable Aisle

The Aisle allows products to be viewed by both humans and AI agents.

Each product contains structured information such as:

SKU
Product name
Aliases
Category
Unit
Pack quantity
Price
MRP
Available stock
GST
Origin
Agent instructions
Allowed substitutions

The complete catalog can also be exported as structured JSON.

📒 Gaddi — Merchant Control Panel

The Gaddi is the merchant's control layer.

It allows the merchant to:

View the order ledger
Monitor agent transactions
View audit records
Configure payment rules
Approve held mandates
Manage inventory
Restock products
Monitor spending

This area represents the boundary between AI automation and human control.

🔐 Payment Safety Model

Munim follows a strict payment workflow:

AI Buyer
   │
   ▼
AI Conversation
   │
   ▼
Product Selection
   │
   ▼
Deterministic Quote Engine
   │
   ▼
Payment Mandate
   │
   ▼
Approval / Validation
   │
   ▼
Payment Capture
   │
   ▼
Audit Trail

The AI can suggest an action, but the payment engine validates it.

🛡️ Safety Rules

Munim uses deterministic rules for sensitive financial operations.

The system prevents:
AI-generated prices
Invalid SKUs
Insufficient stock purchases
Undisclosed substitutions
Payments above mandate limits
Payments without approved mandates
Unlimited payment retries
Expired mandate payments
Core Principle
AI proposes.
The deterministic engine verifies.
The merchant controls.
💳 Payment Flow

The project uses a Razorpay-shaped test-mode payment adapter.

The payment object is designed to resemble a real payment workflow while ensuring that:

No real money leaves the application.

Payment workflow
Quote
  ↓
Mandate Created
  ↓
Mandate Approved
  ↓
Payment Capture
  ↓
Payment Success / Failure
  ↓
Audit Event
⚠️ Failure Handling

Munim intentionally includes a payment failure scenario.

The merchant can simulate a failed payment.

Example:

UPI collect expires
      ↓
Payment marked as failed
      ↓
One retry allowed
      ↓
Retry limit reached
      ↓
Transaction stops

This demonstrates that an autonomous system should know when to stop rather than repeatedly attempting financial actions.

🧩 Main Features
🤖 AI-powered merchant conversation
🛒 Natural language product selection
📦 Structured product catalog
🔎 Product aliases and semantic matching
🧾 Deterministic quote generation
📊 Inventory validation
💰 GST-aware pricing
🔐 Bounded payment mandates
👤 Buyer identification
💳 Test-mode payment capture
🔁 Controlled payment retry
🚫 Payment failure handling
📜 Complete audit trail
🏪 Merchant control dashboard
📦 Inventory management
📋 Agent-readable JSON catalog
🗂️ Application Pages
🏠 The Book

The main landing and story page of Munim.

Introduces the merchant and explains the agentic commerce workflow.

🛒 Counter

The AI-powered purchasing interface.

Buyers can interact with Munim to:

Search products
Build an order
Request quotes
Create mandates
Capture payments

A scripted hotel breakfast order is also included as a demonstration flow.

📒 Gaddi

Merchant management and control dashboard.

Includes:

Ledger
Wall rules
Merchant book
Payment approval
Audit records
Inventory information
🏷️ Aisle

The structured catalog interface.

Products can be viewed as:

Human-readable information
Agent-readable data
JSON catalog
🎯 Pitch

Explains:

The problem
System architecture
Payment safety model
Design decisions
Failure scenarios
AI boundaries
🏗️ Tech Stack
Frontend
React 19
TypeScript
Vite
Tailwind CSS
Routing
TanStack Router
TanStack Start
State Management
Zustand
AI
xAI API
Grok
Database
PostgreSQL
PGlite
Kysely
UI
Radix UI
Lucide React
Validation
Zod
📁 Project Structure
├── src
│   ├── components
│   │   ├── receipt.tsx
│   │   ├── site-shell.tsx
│   │   └── story.tsx
│   │
│   ├── lib
│   │   ├── ai.ts
│   │   ├── catalog.ts
│   │   ├── db.ts
│   │   ├── demo-script.ts
│   │   ├── payments.ts
│   │   ├── policy.ts
│   │   ├── store.ts
│   │   └── utils.ts
│   │
│   ├── routes
│   │   ├── index.tsx
│   │   ├── counter.tsx
│   │   ├── aisle.tsx
│   │   ├── gaddi.tsx
│   │   └── pitch.tsx
│   │
│   ├── router.tsx
│   └── styles.css
│
├── server
│
├── scripts
│
├── public
│
├── package.json
│
└── README.md
🤖 AI Architecture
                 ┌─────────────────┐
                 │   AI BUYER      │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │      MUNIM      │
                 │ AI CONVERSATION │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ ACTION PROPOSAL │
                 │                 │
                 │ • Add SKU       │
                 │ • Quote         │
                 │ • Mandate       │
                 │ • Capture       │
                 └────────┬────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │ DETERMINISTIC ENGINE   │
              │                        │
              │ ✓ Validate stock       │
              │ ✓ Validate price       │
              │ ✓ Validate GST         │
              │ ✓ Validate mandate     │
              │ ✓ Validate limits      │
              └────────────┬───────────┘
                           │
                           ▼
                   ┌──────────────┐
                   │   PAYMENT    │
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │ AUDIT TRAIL  │
                   └──────────────┘
⚙️ Installation

Clone the repository:

git clone https://github.com/alleycandy/ai-revenue-recovery-agent.git

Go to the project directory:

cd ai-revenue-recovery-agent

Install dependencies:

npm install
🔑 Environment Variables

Create an environment file for your API key.

Example:

XAI_API_KEY=your_xai_api_key_here

The AI functionality requires an xAI API key.

If the key is not configured, the application can still demonstrate the scripted purchasing flow.

▶️ Run the Application

Start the development server:

npm run dev

The application will run on the configured local development server.

🧪 Build the Project
npm run build

Run type checking:

npm run typecheck

Run tests:

npm test

Run linting:

npm run lint
🧠 Example AI Actions

The AI returns structured actions instead of directly manipulating financial systems.

Example:

{
  "say": "Six kilograms of thick poha are available.",
  "actions": [
    {
      "op": "add",
      "sku": "POH-THK-1",
      "qty": 6
    },
    {
      "op": "quote"
    }
  ]
}

The application then validates these actions using deterministic business logic.

📊 Merchant Example

The demo merchant is:

Rao & Sons
Camp, Pune

The merchant catalog includes products such as:

Rice
Atta
Poha
Cooking oil
Spices
Pickles
Tea
Pulses
Dairy products
Papad
Sweets

Each product contains inventory and commerce constraints for safe agent transactions.

🎯 Design Philosophy

Munim is built around one important question:

What should an AI agent be allowed to do when money is involved?

The answer implemented in this project is:

AI can understand language.

AI can suggest products.

AI can propose actions.

But AI should not be the source of truth for:

• Prices
• Stock
• Payment limits
• Financial approval
• Retry policies
• Payment execution

Those decisions belong to deterministic systems and merchant-controlled policies.

🔮 Future Improvements
Real payment gateway integration
Live merchant onboarding
Multi-merchant support
Persistent order history
Advanced AI tool calling
Agent-to-agent commerce protocol
Real-time inventory synchronization
Merchant authentication
Payment webhooks
Analytics dashboard
Production deployment
📜 License

This project is currently intended for educational, experimental, and demonstration purposes.
