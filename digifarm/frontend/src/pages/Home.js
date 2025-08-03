import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: '🌡️',
      title: 'Real-Time Sensors',
      description: 'Monitor temperature, humidity, soil moisture, and pH levels in real-time with IoT sensors.',
    },
    {
      icon: '🌦️',
      title: 'Weather Forecast',
      description: 'Get accurate 7-day weather forecasts to plan your farming activities effectively.',
    },
    {
      icon: '🌱',
      title: 'Crop Advisor',
      description: 'Receive AI-powered crop recommendations based on soil type, season, and location.',
    },
    {
      icon: '💬',
      title: 'Ask an Expert',
      description: 'Connect with agricultural experts for personalized advice and solutions.',
    },
    {
      icon: '🛒',
      title: 'Online Marketplace',
      description: 'Sell your crops directly to buyers and connect with the agricultural market.',
    },
    {
      icon: '📊',
      title: 'Expense Manager',
      description: 'Track and analyze your farming expenses with detailed reports and insights.',
    },
  ];

  const testimonials = [
    {
      name: 'Rajesh Kumar',
      location: 'Punjab, India',
      image: '👨‍🌾',
      text: 'DigiFarm has transformed my farming practice. The sensor data helps me make informed decisions about irrigation and fertilization.',
    },
    {
      name: 'Priya Sharma',
      location: 'Maharashtra, India',
      image: '👩‍🌾',
      text: 'The crop advisor feature recommended the perfect crops for my soil type. My yield increased by 30% this season!',
    },
    {
      name: 'Anil Patel',
      location: 'Gujarat, India',
      image: '👨‍🌾',
      text: 'Being able to sell directly through the marketplace eliminated middlemen and increased my profits significantly.',
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Grow Smart. <span className="text-primary-600">Farm Smarter.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Empowering farmers with cutting-edge technology for sustainable and profitable agriculture. 
              Monitor, analyze, and optimize your farming operations with our comprehensive digital platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-primary text-lg px-8 py-3"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="btn-primary text-lg px-8 py-3"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/tips"
                    className="btn-secondary text-lg px-8 py-3"
                  >
                    Learn More
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Farm Management
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to modernize your farming operations and increase productivity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="card hover:shadow-xl transition-shadow duration-300 group"
              >
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">10,000+</div>
              <div className="text-primary-100">Active Farmers</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50,000+</div>
              <div className="text-primary-100">Acres Monitored</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">30%</div>
              <div className="text-primary-100">Average Yield Increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">₹5Cr+</div>
              <div className="text-primary-100">Farmer Revenue Generated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Farmers Say
            </h2>
            <p className="text-xl text-gray-600">
              Real stories from farmers who transformed their operations with DigiFarm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-4">{testimonial.image}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                    <p className="text-gray-600 text-sm">{testimonial.location}</p>
                  </div>
                </div>
                <p className="text-gray-700 italic">"{testimonial.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Farm?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers who are already using DigiFarm to increase their productivity and profits.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="btn-primary text-lg px-8 py-3"
            >
              Start Your Free Trial
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;