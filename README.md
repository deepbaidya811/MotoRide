# MotoRide 🏍️

A motorcycle ride-hailing application built with Next.js, featuring real-time location tracking, route mapping, and seamless user experience.

## Features

### For Passengers
- **Location Search**: Search pickup and drop-off locations with autocomplete suggestions
- **Current Location**: Use your device's GPS for accurate current location
- **Interactive Map**: View pickup/dropoff markers with real road route between locations
- **Distance Calculation**: Shows estimated distance in kilometers
- **User Type Switching**: Switch between Passenger and Rider modes

### For Riders  
- **Profile Management**: Update personal information and settings
- **Account Status**: Automatic active/inactive status tracking on login/logout

### Technical Features
- **Real-time Geolocation**: Browser GPS integration for accurate positioning
- **OpenStreetMap**: Free map data with Leaflet.js integration
- **OSRM Routing**: Real road-based route calculation
- **JWT Authentication**: Secure login with JSON Web Tokens
- **SQLite Database**: Lightweight local database for user data

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS 4
- **Maps**: Leaflet.js, OpenStreetMap
- **Routing**: OSRM (Open Source Routing Machine)
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT with bcryptjs

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
uber/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── auth/         # Authentication endpoints
│   ├── dashboard/        # Dashboard pages
│   │   ├── passenger/    # Passenger dashboard
│   │   ├── rider/         # Rider dashboard
│   │   └── profile/       # Profile settings
│   └── page.js           # Landing page
├── lib/                   # Database configuration
└── motoride.db           # SQLite database
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/update-profile` | POST | Update user profile |
| `/api/auth/update-user-type` | POST | Switch user type |

## Environment Variables

Create a `.env.local` file:

```env
JWT_SECRET=your_secret_key_here
```

## Default Location

The app defaults to Kolkata, India (22.5726°N, 88.3639°E) when location services are unavailable.

## License

MIT License