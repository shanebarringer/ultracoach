# UltraCoach: Ultramarathon Training App

## Project Overview

UltraCoach is a NextJS-based web application that connects ultramarathon runners with coaches, providing comprehensive training plan management, real-time communication, and progress tracking.

## Technology Stack

- **Frontend**: NextJS 13 with React
- **Backend**: NextJS API routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with Supabase integration
- **Styling**: Tailwind CSS with @tailwindcss/forms
- **Real-time**: Supabase real-time subscriptions
- **Deployment**: Vercel (recommended)

## Project Structure

```
ultracoach/
├── components/
│   ├── layout/
│   │   ├── Layout.js
│   │   ├── Header.js
│   │   ├── Footer.js
│   │   ├── Sidebar.js
│   │   └── MobileNav.js
│   ├── dashboard/
│   │   ├── RunnerDashboard.js
│   │   └── CoachDashboard.js
│   ├── workouts/
│   │   ├── WorkoutCard.js
│   │   └── WorkoutList.js
│   ├── chat/
│   │   ├── ChatWindow.js
│   │   ├── MessageList.js
│   │   ├── MessageInput.js
│   │   └── ConversationList.js
│   └── common/
│       ├── NotificationBell.js
│       └── Notification.js
├── lib/
│   └── supabase.js
├── hooks/
│   └── useSupabaseRealtime.js
├── contexts/
│   └── NotificationContext.js
├── pages/
│   ├── index.js
│   ├── _app.js
│   ├── _document.js
│   ├── dashboard/
│   │   └── index.js
│   ├── chat/
│   │   └── [userId].js
│   ├── training/
│   │   └── plans/
│   │       └── [id].js
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth].js
│       │   └── signup.js
│       ├── training/
│       │   └── workouts/
│       │       ├── index.js
│       │       └── [id].js
│       └── messages/
│           └── index.js
├── styles/
│   └── globals.css
├── package.json
├── next.config.js
├── tailwind.config.js
└── .env.local
```

## Database Schema

### Tables
1. **users** - Runner and coach profiles
2. **training_plans** - Training plans created by coaches
3. **workouts** - Individual workout sessions
4. **messages** - Chat messages between users
5. **notifications** - System notifications

### Key Features
- Row Level Security (RLS) for data protection
- Real-time subscriptions for chat and notifications
- Automatic triggers for notifications

## Key Features Implemented

### 1. User Management
- Dual role system (runners and coaches)
- Profile management
- Secure authentication with NextAuth.js

### 2. Training Plan Management
- Coaches create and assign training plans
- Plans include target race information
- Workout scheduling and tracking

### 3. Workout Tracking
- Detailed workout logging
- Injury and notes tracking
- Coach feedback system
- Real-time status updates

### 4. Communication System
- Real-time chat between runners and coaches
- Message read status
- Conversation management

### 5. Notification System
- Real-time notifications for important events
- Different notification types (messages, workouts, comments)
- Unread counters and management

### 6. Mobile Responsive Design
- Tailwind CSS implementation
- Mobile navigation
- Responsive layouts

## Setup Instructions

### 1. Initialize Project
```bash
npx create-next-app@latest ultracoach
cd ultracoach
```

### 2. Install Dependencies
```bash
npm install @supabase/supabase-js next-auth bcrypt @tailwindcss/forms
npm install --save-dev tailwindcss postcss autoprefixer
```

### 3. Environment Variables (.env.local)
```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-characters
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Supabase Setup
1. Create project at [supabase.com](https://supabase.com)
2. Run the SQL migrations to create tables
3. Set up Row Level Security policies
4. Configure real-time subscriptions

### 5. Key Files to Create

#### package.json
```json
{
  "name": "ultracoach",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@tailwindcss/forms": "^0.5.3",
    "@supabase/supabase-js": "^2.38.0",
    "bcrypt": "^5.1.0",
    "next": "13.4.3",
    "next-auth": "^4.22.1",
    "react": "18.2.0",
    "react-dom": "18.2.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.14",
    "eslint": "8.41.0",
    "eslint-config-next": "13.4.3",
    "postcss": "^8.4.23",
    "tailwindcss": "^3.3.2"
  }
}
```

#### tailwind.config.js
```javascript
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
```

#### styles/globals.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
}
```

## Data Import from CSV

Your uploaded CSV ("Shanes Running Log.csv") contains:
- Day, Date, Run Plan, Actual, Injury Comments, Life/Workout Notes, Comments from Corinne

Create a data import script to map this to your workouts table.

## Development Workflow

1. **Start with authentication** - Set up NextAuth.js with Supabase
2. **Create user interfaces** - Dashboard, profile management
3. **Implement training plan management** - CRUD operations
4. **Add workout tracking** - Real-time updates
5. **Build chat system** - Real-time messaging
6. **Add notifications** - Real-time alerts
7. **Polish UI/UX** - Mobile responsiveness, animations

## Real-time Features

The app uses Supabase real-time subscriptions for:
- Chat messages
- Workout updates
- Notifications
- Training plan changes

## Security Considerations

- Row Level Security (RLS) policies protect user data
- NextAuth.js handles secure authentication
- Environment variables protect sensitive keys
- Input validation on both client and server

## Deployment

1. **Vercel Deployment**
   - Connect GitHub repository
   - Set environment variables
   - Configure custom domain

2. **Supabase Configuration**
   - Set up production database
   - Configure authentication providers
   - Set up custom SMTP for emails

## Next Steps

1. Clone or create the project structure
2. Set up Supabase project and database
3. Implement authentication flow
4. Create user dashboards
5. Build training plan management
6. Add real-time chat
7. Implement notification system
8. Test and deploy

## Important Notes

- This is designed as a learning project using modern web technologies
- Supabase provides an excellent backend-as-a-service for rapid development
- The app is mobile-first and responsive
- Real-time features enhance user experience
- Row Level Security ensures data protection

## Support Resources

- [NextJS Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

This summary provides everything needed to recreate and extend the UltraCoach application using modern web development best practices.
