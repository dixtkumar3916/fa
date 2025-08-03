import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    location: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    farmDetails: {
      farmSize: '',
      farmType: 'conventional',
      soilType: 'loamy',
      crops: [],
    },
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.mobile.trim()) {
      newErrors.mobile = 'Mobile number is required';
    } else if (!/^[0-9]{10}$/.test(formData.mobile.replace(/\D/g, ''))) {
      newErrors.mobile = 'Mobile number must be 10 digits';
    }

    if (!formData.farmDetails.farmSize) {
      newErrors.farmSize = 'Farm size is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const registrationData = {
        ...formData,
        farmDetails: {
          ...formData.farmDetails,
          farmSize: parseFloat(formData.farmDetails.farmSize),
        },
      };

      const result = await register(registrationData);
      if (result.success) {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-2xl">🌱</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create your farmer account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 input-field ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter your full name"
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={`mt-1 input-field ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter your email"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
                    Mobile Number *
                  </label>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    required
                    value={formData.mobile}
                    onChange={handleChange}
                    className={`mt-1 input-field ${errors.mobile ? 'border-red-500' : ''}`}
                    placeholder="Enter your mobile number"
                  />
                  {errors.mobile && <p className="mt-1 text-sm text-red-600">{errors.mobile}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className={`input-field pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                      </svg>
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`mt-1 input-field ${errors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Location Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Location Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="location.address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    id="location.address"
                    name="location.address"
                    type="text"
                    value={formData.location.address}
                    onChange={handleChange}
                    className="mt-1 input-field"
                    placeholder="Enter your address"
                  />
                </div>

                <div>
                  <label htmlFor="location.city" className="block text-sm font-medium text-gray-700">
                    City
                  </label>
                  <input
                    id="location.city"
                    name="location.city"
                    type="text"
                    value={formData.location.city}
                    onChange={handleChange}
                    className="mt-1 input-field"
                    placeholder="Enter your city"
                  />
                </div>

                <div>
                  <label htmlFor="location.state" className="block text-sm font-medium text-gray-700">
                    State
                  </label>
                  <input
                    id="location.state"
                    name="location.state"
                    type="text"
                    value={formData.location.state}
                    onChange={handleChange}
                    className="mt-1 input-field"
                    placeholder="Enter your state"
                  />
                </div>

                <div>
                  <label htmlFor="location.pincode" className="block text-sm font-medium text-gray-700">
                    Pincode
                  </label>
                  <input
                    id="location.pincode"
                    name="location.pincode"
                    type="text"
                    value={formData.location.pincode}
                    onChange={handleChange}
                    className="mt-1 input-field"
                    placeholder="Enter your pincode"
                  />
                </div>
              </div>
            </div>

            {/* Farm Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Farm Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="farmDetails.farmSize" className="block text-sm font-medium text-gray-700">
                    Farm Size (in acres) *
                  </label>
                  <input
                    id="farmDetails.farmSize"
                    name="farmDetails.farmSize"
                    type="number"
                    step="0.1"
                    required
                    value={formData.farmDetails.farmSize}
                    onChange={handleChange}
                    className={`mt-1 input-field ${errors.farmSize ? 'border-red-500' : ''}`}
                    placeholder="Enter farm size"
                  />
                  {errors.farmSize && <p className="mt-1 text-sm text-red-600">{errors.farmSize}</p>}
                </div>

                <div>
                  <label htmlFor="farmDetails.farmType" className="block text-sm font-medium text-gray-700">
                    Farm Type
                  </label>
                  <select
                    id="farmDetails.farmType"
                    name="farmDetails.farmType"
                    value={formData.farmDetails.farmType}
                    onChange={handleChange}
                    className="mt-1 input-field"
                  >
                    <option value="conventional">Conventional</option>
                    <option value="organic">Organic</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="farmDetails.soilType" className="block text-sm font-medium text-gray-700">
                    Soil Type
                  </label>
                  <select
                    id="farmDetails.soilType"
                    name="farmDetails.soilType"
                    value={formData.farmDetails.soilType}
                    onChange={handleChange}
                    className="mt-1 input-field"
                  >
                    <option value="clay">Clay</option>
                    <option value="sandy">Sandy</option>
                    <option value="loamy">Loamy</option>
                    <option value="silt">Silt</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <LoadingSpinner size="sm" color="white" /> : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;