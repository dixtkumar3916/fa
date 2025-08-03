# DigiFarm - Smart Farming Management System

**Grow Smart. Farm Smarter.**

DigiFarm is a comprehensive full-stack web application designed to empower farmers with cutting-edge technology for sustainable and profitable agriculture. Built with React (frontend) and Node.js with Express (backend), this platform provides everything farmers need to modernize their operations.

## 🌟 Features

### 🔒 Authentication
- Secure farmer login & signup with JWT authentication
- Comprehensive farmer profile management
- Protected routes and user sessions

### 🏠 Public Pages
- **Home Page**: Hero section with "Grow Smart. Farm Smarter." tagline
- **Feature Highlights**: Animated cards showcasing platform capabilities
- **Testimonials**: Real farmer success stories
- **Call-to-Action**: Easy signup and learning resources

### 👨‍🌾 Farmer Dashboard (Protected)
- Personalized dashboard with location-based weather
- Overview cards for expenses, crops, sales, and reports
- Real-time sensor status and alerts
- Quick access to all farming tools

### 📍 Real-Time Sensors
- Live temperature, humidity, soil moisture, and pH monitoring
- Historical data visualization and trends
- Automated alerts for critical conditions
- Sensor calibration and management

### 🌦️ Weather Forecast
- 7-day weather forecasts using OpenWeatherMap API
- Location-based weather data
- Temperature, humidity, wind, and precipitation details
- Weather-based farming recommendations

### 💡 Crop Advisor
- AI-powered crop recommendations based on:
  - Soil type (clay, sandy, loamy, silt)
  - Season (summer, winter, monsoon)
  - Farm size and budget
- Fertilizer recommendations with application schedules
- Pest control guidance for specific crops
- Estimated costs and profit projections

### 📚 Tips & Training
- Comprehensive library of farming articles and videos
- Categories: crop management, pest control, soil health, irrigation
- YouTube video embeds for training content
- Search and filter functionality
- Like and view tracking

### 💬 Ask an Expert
- Live chat system with agricultural experts
- Message history and conversation tracking
- Expert assignment and availability management
- Rating and feedback system
- Real-time notifications via Socket.IO

### 🛒 Online Crop Marketplace
- Create and manage crop listings
- Browse crops by location, price, and quality
- Direct buyer-seller communication
- Inquiry system with contact details
- Market analytics and trending crops

### 📋 Expense Manager
- Track daily/monthly farming expenses
- Categories: seeds, fertilizers, labor, equipment, etc.
- Visual analytics with charts and graphs
- Expense trends and budget tracking
- Receipt management and vendor details

### 📈 Reports Generator
- Generate comprehensive PDF/Excel reports:
  - Monthly expense reports
  - Sales and earnings summaries
  - Crop performance analysis
  - Comprehensive farm reports
- Downloadable reports with charts and insights

### ⚙️ Admin Panel (Optional)
- Manage tips and training content
- Expert user management
- System-wide analytics and monitoring

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript support
- **Tailwind CSS** for responsive design
- **React Router** for navigation
- **Axios** for API communication
- **Socket.IO Client** for real-time features
- **Recharts** for data visualization
- **React Hot Toast** for notifications
- **jsPDF** for report generation

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.IO** for real-time communication
- **bcryptjs** for password hashing
- **Multer** for file uploads
- **Nodemailer** for email services
- **Axios** for external API calls

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd digifarm
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Setup**
   
   Create `.env` file in the backend directory:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/digifarm
   JWT_SECRET=your_jwt_secret_key_here
   OPENWEATHER_API_KEY=your_openweather_api_key_here
   
   # Email Configuration (Optional)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

5. **Start MongoDB**
   Make sure MongoDB is running on your system.

6. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server will start on http://localhost:5000

7. **Start the Frontend Development Server**
   ```bash
   cd frontend
   npm start
   ```
   Application will open on http://localhost:3000

## 📊 API Endpoints

### Authentication
- `POST /api/auth/farmer/register` - Register new farmer
- `POST /api/auth/farmer/login` - Farmer login
- `GET /api/auth/farmer/profile` - Get farmer profile
- `PUT /api/auth/farmer/profile` - Update farmer profile

### Dashboard
- `GET /api/farmers/dashboard` - Get dashboard data
- `GET /api/farmers/analytics` - Get analytics data

### Weather
- `GET /api/weather/current/:city` - Get current weather
- `GET /api/weather/forecast/:city` - Get weather forecast

### Sensors
- `GET /api/sensors/current` - Get current sensor readings
- `GET /api/sensors/history` - Get sensor history
- `GET /api/sensors/alerts` - Get sensor alerts

### Crop Management
- `GET /api/crops` - Get farmer's crops
- `POST /api/crops` - Add new crop
- `PUT /api/crops/:id` - Update crop
- `DELETE /api/crops/:id` - Delete crop

### Marketplace
- `GET /api/market/listings` - Get market listings
- `POST /api/market/listings` - Create new listing
- `GET /api/market/listings/:id` - Get single listing
- `POST /api/market/listings/:id/inquire` - Send inquiry

### Expenses
- `GET /api/expenses` - Get expenses
- `POST /api/expenses` - Add expense
- `GET /api/expenses/summary` - Get expense summary

### Reports
- `GET /api/reports/expenses` - Generate expense report
- `GET /api/reports/sales` - Generate sales report
- `GET /api/reports/comprehensive` - Generate comprehensive report

### Tips & Training
- `GET /api/tips` - Get tips and articles
- `GET /api/tips/:id` - Get single tip
- `POST /api/tips/:id/like` - Like a tip

### Chat System
- `POST /api/chat/start` - Start new chat
- `GET /api/chat/farmer` - Get farmer's chats
- `POST /api/chat/:id/message` - Send message

### Crop Advisor
- `POST /api/advice/crop-recommendation` - Get crop recommendations
- `POST /api/advice/fertilizer-recommendation` - Get fertilizer advice
- `GET /api/advice/pest-control/:cropName` - Get pest control advice

## 🎨 Design Features

- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Modern UI**: Clean, intuitive interface with Tailwind CSS
- **Dark/Light Theme**: Comfortable viewing in any lighting
- **Interactive Charts**: Real-time data visualization
- **Smooth Animations**: Enhanced user experience
- **Accessibility**: WCAG compliant design

## 🔧 Development

### Available Scripts

**Backend:**
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

**Frontend:**
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Project Structure

```
digifarm/
├── backend/
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication & validation
│   ├── controllers/     # Business logic
│   ├── utils/           # Helper functions
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── utils/       # Utility functions
│   │   └── App.js       # Main app component
│   └── public/          # Static assets
└── README.md
```

## 🌱 Sample Data

The application includes sample data for:
- Farming tips and training articles
- Crop recommendations database
- Weather simulation data
- Sensor simulation data
- Demo user accounts

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or your preferred database
2. Configure environment variables
3. Deploy to Heroku, DigitalOcean, or AWS
4. Update CORS settings for production domain

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to Netlify, Vercel, or serve with nginx
3. Update API base URL for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- OpenWeatherMap for weather data
- MongoDB for database solutions
- React and Node.js communities
- All the farmers who inspired this project

## 📞 Support

For support and questions:
- Email: support@digifarm.com
- Documentation: [Link to docs]
- Issues: [GitHub Issues]

---

**Made with ❤️ for farmers worldwide**

*Empowering agriculture through technology*