# DigiFarm - Smart Farming Web Application

A comprehensive full-stack web application for modern smart farming, built with React, Node.js, Express, and MongoDB.

## Features

### 🔒 Authentication
- Secure farmer login & signup with JWT
- Protected routes and user sessions
- Farmer profile management

### 🧭 Public Home Page
- Hero section with engaging tagline
- Feature highlights with animations
- Testimonials and call-to-action

### 👨‍🌾 Farmer Dashboard
- Personalized dashboard with weather integration
- Overview cards for expenses, crops, sales, reports
- Real-time sensor status monitoring

### 📍 Real-Time Sensors
- Live farm data simulation/integration
- Temperature, humidity, moisture, pH monitoring
- Socket.io for real-time data streaming

### 🌦 Weather Forecast
- 7-day weather forecast using OpenWeatherMap API
- Interactive weather cards and charts

### 💡 Crop Advisor
- Intelligent crop recommendations
- Based on soil type, region, season, farm size
- Fertilizer suggestions and farming tips

### 📚 Tips & Training
- Video tutorials and educational content
- Articles on smart farming practices
- Search and tag filtering system

### 💬 Ask an Expert
- Live chat with agricultural advisors
- Message history and expert profiles
- Real-time communication system

### 🛒 Online Crop Selling
- Crop listing marketplace
- Buyer-seller communication system
- Location-based crop browsing

### 📋 Expense Manager
- Daily/monthly expense tracking
- Categorization and analytics
- Visual charts and reports

### 📈 Reports Generator
- Automated PDF/Excel report generation
- Monthly expenses and sales reports
- Sensor data analysis

### ⚙️ Admin Panel
- Content management system
- User and expert management
- System analytics dashboard

## Tech Stack

**Frontend:**
- React 18
- Tailwind CSS
- React Router
- Axios
- Recharts/Chart.js
- Socket.io Client

**Backend:**
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Socket.io
- Multer for file uploads

**Additional Services:**
- OpenWeatherMap API
- PDF/Excel generation libraries

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd digifarm
```

2. Install all dependencies
```bash
npm run install-all
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both `server` and `client` directories
   - Fill in your MongoDB connection string, JWT secret, and API keys

4. Start the development servers
```bash
npm run dev
```

This will start both the backend server (port 5000) and frontend (port 3000) concurrently.

## Environment Variables

### Server (.env)
```
MONGODB_URI=mongodb://localhost:27017/digifarm
JWT_SECRET=your_jwt_secret_key
OPENWEATHER_API_KEY=your_openweather_api_key
PORT=5000
```

### Client (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## Project Structure

```
digifarm/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
├── server/                # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   └── utils/            # Utility functions
└── docs/                 # Documentation
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new farmer
- `POST /api/auth/login` - Login farmer
- `GET /api/auth/profile` - Get farmer profile

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/weather/:location` - Get weather data

### Crops
- `GET /api/crops` - Get all crop listings
- `POST /api/crops` - Create new crop listing
- `PUT /api/crops/:id` - Update crop listing
- `DELETE /api/crops/:id` - Delete crop listing

### Expenses
- `GET /api/expenses` - Get farmer expenses
- `POST /api/expenses` - Add new expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Reports
- `GET /api/reports/expenses` - Generate expense report
- `GET /api/reports/sales` - Generate sales report

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.