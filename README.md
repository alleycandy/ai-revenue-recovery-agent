# 🧾 Munim

## AI-Assisted Commerce & Payment Workflow for Agentic Buyers

Munim is an experimental **AI-assisted commerce and payment workflow platform** designed to make traditional merchants discoverable, understandable, and safely transactable by AI agents.

> **AI can understand intent and propose actions, but deterministic systems should control money.**

---

## 📌 About the Project

Traditional merchants may already accept digital payments, but they are often difficult for AI purchasing agents to understand and interact with.

An AI agent needs structured information about:

- Products and SKUs
- Product aliases
- Available inventory
- Prices
- GST
- Product substitutions
- Merchant rules
- Payment limits

Munim creates an **agent-readable commerce layer** around a merchant while ensuring that sensitive financial actions remain controlled by deterministic business logic.

---

## ✨ Features

### 🤖 AI-Powered Counter

The AI-powered Counter allows buyers or AI agents to:

- Search products using natural language
- Understand product aliases
- Add products to an order
- Request quotes
- Create payment mandates
- Capture payments
- Handle payment failures
- Perform controlled retries

---

### 🏪 Agent-Readable Aisle

The Aisle provides structured product information for both humans and AI agents.

Each product can include:

- Product name
- SKU
- Product aliases
- Category
- Unit
- Pack quantity
- Price
- MRP
- Available stock
- GST
- Origin
- Agent instructions
- Allowed substitutions

The catalog can also be made available as structured JSON for AI-agent interaction.

---

### 📒 Gaddi — Merchant Control Panel

The Gaddi acts as the merchant's control center.

It allows merchants to:

- View orders
- Monitor transactions
- Manage inventory
- Configure business rules
- Review payment mandates
- Track audit records
- Monitor agent activity
- Restock products

This creates a clear boundary between **AI automation and merchant control**.

---

## 🔐 Safe Payment Architecture

Munim follows a controlled payment workflow:

```text
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
Validation & Approval
   │
   ▼
Payment Capture
   │
   ▼
Audit Trail

The AI can propose an action, but the system validates it before any sensitive operation is performed.

🛡️ Core Safety Principles

Munim prevents AI from becoming the source of truth for financial operations.

The deterministic system validates:

❌ AI-generated prices
❌ Invalid SKUs
❌ Insufficient stock
❌ Undisclosed substitutions
❌ Payments above mandate limits
❌ Unauthorized payments
❌ Unlimited payment retries
❌ Expired payment mandates
Core Principle
AI proposes.
The deterministic engine verifies.
The merchant controls.
💳 Payment Workflow

The application uses a test-mode payment workflow designed to simulate real-world payment operations.

Quote Created
      ↓
Payment Mandate Created
      ↓
Mandate Validation
      ↓
Payment Capture
      ↓
Payment Success / Failure
      ↓
Audit Record Created

The architecture ensures that financial actions follow predefined rules and remain auditable.

⚠️ Failure Handling

Munim includes controlled payment failure scenarios.

Example:

Payment Attempt
      ↓
Payment Fails
      ↓
Failure Recorded
      ↓
Retry Allowed?
      ↓
Yes → Controlled Retry
No  → Transaction Stops

The system ensures that payment retries remain bounded and prevents uncontrolled financial operations.

🧩 Main Application Modules
🏠 The Book

The main landing and story page of Munim.

It introduces the project and explains how AI agents can interact with merchants safely.

🛒 Counter

The AI-powered purchasing interface.

Users or AI agents can:

Search for products
Add products to orders
Request quotes
Create payment mandates
Capture payments
📒 Gaddi

The merchant management dashboard.

It provides access to:

Order records
Payment activity
Inventory
Merchant rules
Audit records
Mandate management
🏷️ Aisle

The structured merchant catalog.

It provides product information for both:

Human users
AI agents
🎯 Pitch

The project explanation area covering:

The problem
The proposed solution
System architecture
AI boundaries
Payment safety
Failure handling
🏗️ Tech Stack
Frontend
React
TypeScript
Vite
Tailwind CSS
Routing
TanStack Router
TanStack Start
State Management
Zustand
AI
xAI / Grok API
Database
PostgreSQL
PGlite
Kysely
UI Components
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
├── scripts
├── public
├── package.json
└── README.md
🤖 AI Architecture
                 ┌─────────────────┐
                 │    AI BUYER     │
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
                 │ • Add Product   │
                 │ • Create Quote  │
                 │ • Create Mandate│
                 │ • Capture Pay   │
                 └────────┬────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │ DETERMINISTIC ENGINE   │
              │                        │
              │ ✓ Validate Stock       │
              │ ✓ Validate Price       │
              │ ✓ Validate GST         │
              │ ✓ Validate Mandate     │
              │ ✓ Validate Limits      │
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

git clone <your-repository-url>

Navigate to the project folder:

cd <project-folder>

Install dependencies:

npm install
🔑 Environment Variables

Create an environment file and add your API key.

Example:

XAI_API_KEY=your_api_key_here
▶️ Running the Project

Start the development server:

npm run dev
🏗️ Build the Project

Create a production build:

npm run build

Run type checking:

npm run typecheck

Run tests:

npm test

Run linting:

npm run lint
🧠 Example AI Action

The AI returns structured actions instead of directly controlling sensitive systems.

Example:

{
  "say": "The requested product is available.",
  "actions": [
    {
      "op": "add",
      "sku": "PRODUCT-SKU",
      "qty": 2
    },
    {
      "op": "quote"
    }
  ]
}

The application validates every action through deterministic business logic.

🎯 Design Philosophy

Munim is built around an important question:

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

These responsibilities belong to deterministic systems and merchant-controlled policies.

🔮 Future Improvements
Real payment gateway integration
Multi-merchant support
Merchant authentication
Persistent transaction history
Real-time inventory synchronization
Advanced AI tool calling
Agent-to-agent commerce
Payment webhooks
Analytics dashboard
Production deployment
📜 License

This project is intended for educational, experimental, and demonstration purposes.
