# Agency Dashboard

A modern full-stack web application for managing and exploring agencies and their contact information. Built with Next.js, MongoDB, and Clerk authentication.


## User Request Flow

```mermaid
sequenceDiagram
    participant User
    participant Client as Next.js Client
    participant Middleware as Clerk Middleware
    participant API as API Route
    participant DB as MongoDB

    User->>Client: Access /dashboard/contacts
    Client->>Middleware: Check Authentication
    
    alt Not Authenticated
        Middleware-->>Client: Redirect to Login
        Client-->>User: Show Login Page
    else Authenticated
        Middleware-->>Client: Allow Access
        Client->>API: GET /api/contacts
        
        activate API
        API->>DB: Check Daily Limit (View Logs)
        DB-->>API: Return Usage Count
        
        alt Limit Exceeded
            API-->>Client: Return 200 (Limit Exceeded)
            Client-->>User: Show "Limit Reached" Banner
        else Limit OK
            API->>DB: Fetch Contacts & Viewed Status
            DB-->>API: Return Data
            API->>DB: Update View Logs & Viewed Contacts
            API-->>Client: Return Contacts Data
            Client-->>User: Display Contacts Table
        end
        deactivate API
    end
```

## Features

- **Agencies Management**: Browse 922+ agencies across different states with filtering, sorting, and pagination
- **Contacts Management**: Access 1000+ contacts with a daily view limit of 50
- **User Authentication**: Secure login with Clerk
- **Daily Limits**: Track contact views with a daily quota system
- **Advanced Filtering**: Search and filter by name, email, agency, state, and more
- **Real-time Sorting**: Sort by multiple fields in ascending/descending order
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **Authentication**: Clerk
- **Deployment**: Vercel

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agencies/route.ts
│   │   │   └── contacts/
│   │   │       ├── route.ts
│   │   │       └── reset-limit/route.ts
│   │   ├── dashboard/
│   │   │   ├── agencies/page.tsx
│   │   │   └── contacts/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── not-found.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   └── contactLimiter.ts
│   └── globals.css
├── scripts/
│   └── seedDatabase.ts
├── data/
│   ├── agencies_agency_rows.csv
│   └── contacts_contact_rows.csv
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Clerk account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/AghlaAbdo/AgencyDash.git
cd AgencyDash
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

4. **Seed the database**

Place your CSV files in the `data/` directory:
- `agencies_agency_rows.csv`
- `contacts_contact_rows.csv`

Then run:
```bash
npm run seed
```

5. **Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features in Detail

### Agencies Page
- View all 922+ agencies
- Filter by state and agency type
- Search by name or county
- Sort by name, state, population, or creation date
- Pagination with customizable page size

### Contacts Page
- View 1000+ contacts with daily limit of 50
- Search by first name, last name, or email
- Filter by agency name
- Sort by multiple fields
- Visual progress bar showing daily quota usage
- Reset daily limit with "Upgrade Plan" button
- View detailed contact information

### Daily Limit System
- 50 contacts viewable per day per user
- Tracked in MongoDB with user sessions
- Progress bar shows remaining quota
- Color-coded indicator (green/yellow/red)
- Option to upgrade and reset limit

## API Endpoints

### GET /api/agencies
Fetch agencies with filters, sorting, and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10, max: 100)
- `state`: Filter by state code
- `type`: Filter by agency type
- `search`: Search by name or county
- `sortBy`: Field to sort by (default: name)
- `sortOrder`: 'asc' or 'desc' (default: asc)

### GET /api/contacts
Fetch contacts with daily limit tracking.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 10, max: 50)
- `agencyName`: Filter by agency name
- `search`: Search by name or email
- `sortBy`: Field to sort by (default: last_name)
- `sortOrder`: 'asc' or 'desc' (default: asc)

**Response:**
```json
{
  "success": true,
  "limitExceeded": false,
  "viewedToday": 25,
  "remaining": 25,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1000,
    "totalPages": 100,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### POST /api/contacts/reset-limit
Reset the daily contact view limit (requires authentication).

## Database Schema

### Agencies Collection
```typescript
{
  id: string,
  name: string,
  state: string,
  state_code: string,
  type: string,
  population: string,
  website: string,
  county: string,
  created_at: string,
  updated_at: string
}
```

### Contacts Collection
```typescript
{
  id: string,
  first_name: string,
  last_name: string,
  email: string,
  phone: string,
  title: string,
  email_type: string,
  contact_form_url: string,
  department: string,
  agency_name: string,
  agency_id: string,
  firm_id: string,
  created_at: string,
  updated_at: string
}
```

### Contact View Logs Collection
```typescript
{
  user_id: string,
  date: string,
  count: number
}
```

### Viewed Contacts Collection
```typescript
{
  user_id: string,
  contact_id: string,
  date: string
}
```

## Development

### Available Scripts

```bash
# Seed database
npm run seed

# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Authentication

The application uses Clerk for secure user authentication. Users must log in before accessing the dashboard.

- Sign up with email or OAuth providers
- Automatic session management
- User ID tracking for quota limits
- Automatic token refresh

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Environment Variables for Production

Set these in Vercel project settings:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `MONGODB_URI`

## License

This project is licensed under the MIT License.
