const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  welcome: (data) => ({
    subject: 'Welcome to Agro Connect',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; text-align: center;">
          <h1>🌾 Welcome to Agro Connect</h1>
          <p>Your modern agriculture platform</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Hello ${data.name}!</h2>
          <p>Welcome to Agro Connect! We're excited to have you join our community of farmers, experts, and agricultural professionals.</p>
          
          <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #4CAF50;">
            <h3>Your Account Details:</h3>
            <p><strong>Role:</strong> ${data.role}</p>
            <p><strong>Status:</strong> Active</p>
          </div>
          
          <h3>What you can do now:</h3>
          <ul>
            <li>Complete your profile</li>
            <li>Explore the platform features</li>
            <li>Connect with agricultural experts</li>
            <li>Access farming resources and tools</li>
          </ul>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.CLIENT_URL}/dashboard" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Go to Dashboard
            </a>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Agro Connect. All rights reserved.</p>
          <p>If you have any questions, contact us at support@agroconnect.com</p>
        </div>
      </div>
    `
  }),
  
  passwordReset: (data) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ff9800, #f57c00); color: white; padding: 20px; text-align: center;">
          <h1>🔐 Password Reset</h1>
          <p>Agro Connect Account Security</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Hello ${data.name}!</h2>
          <p>We received a request to reset your password for your Agro Connect account.</p>
          
          <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #ff9800;">
            <h3>Reset Code:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #ff9800; text-align: center; letter-spacing: 2px;">
              ${data.resetToken}
            </p>
            <p style="text-align: center; color: #666;">This code is valid for 10 minutes</p>
          </div>
          
          <p>If you didn't request this password reset, please ignore this email or contact our support team immediately.</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.resetUrl}" style="background: #ff9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #856404;"><strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your password or reset code.</p>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Agro Connect. All rights reserved.</p>
          <p>If you have any questions, contact us at support@agroconnect.com</p>
        </div>
      </div>
    `
  }),
  
  emailVerification: (data) => ({
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2196F3, #1976D2); color: white; padding: 20px; text-align: center;">
          <h1>📧 Email Verification</h1>
          <p>Agro Connect Account Verification</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Hello ${data.name}!</h2>
          <p>Thank you for signing up with Agro Connect! To complete your registration, please verify your email address.</p>
          
          <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2196F3;">
            <h3>Verification Code:</h3>
            <p style="font-size: 24px; font-weight: bold; color: #2196F3; text-align: center; letter-spacing: 2px;">
              ${data.verificationToken}
            </p>
            <p style="text-align: center; color: #666;">This code is valid for 24 hours</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${data.verificationUrl}" style="background: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          
          <p>Once verified, you'll have full access to all Agro Connect features including:</p>
          <ul>
            <li>Soil analysis and recommendations</li>
            <li>Equipment booking marketplace</li>
            <li>Expert consultation services</li>
            <li>Farming resources and guides</li>
          </ul>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Agro Connect. All rights reserved.</p>
          <p>If you have any questions, contact us at support@agroconnect.com</p>
        </div>
      </div>
    `
  }),
  
  bookingConfirmation: (data) => ({
    subject: 'Equipment Booking Confirmed',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #4CAF50, #45a049); color: white; padding: 20px; text-align: center;">
          <h1>✅ Booking Confirmed</h1>
          <p>Equipment Rental Confirmation</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Hello ${data.farmerName}!</h2>
          <p>Your equipment booking has been confirmed successfully.</p>
          
          <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px;">
            <h3>Booking Details:</h3>
            <p><strong>Booking ID:</strong> ${data.bookingId}</p>
            <p><strong>Equipment:</strong> ${data.equipmentName}</p>
            <p><strong>Start Date:</strong> ${data.startDate}</p>
            <p><strong>End Date:</strong> ${data.endDate}</p>
            <p><strong>Total Amount:</strong> ₹${data.totalAmount}</p>
            <p><strong>Payment Status:</strong> ${data.paymentStatus}</p>
          </div>
          
          <div style="background: #e8f5e8; border: 1px solid #4CAF50; padding: 10px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0; color: #2e7d32;"><strong>Important:</strong> Please ensure you have the necessary documentation and operator details ready for the equipment pickup.</p>
          </div>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.CLIENT_URL}/bookings/${data.bookingId}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Booking Details
            </a>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Agro Connect. All rights reserved.</p>
          <p>If you have any questions, contact us at support@agroconnect.com</p>
        </div>
      </div>
    `
  }),
  
  expertAssignment: (data) => ({
    subject: 'Agricultural Expert Assigned',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #9C27B0, #7B1FA2); color: white; padding: 20px; text-align: center;">
          <h1>👨‍🔬 Expert Assigned</h1>
          <p>Your Agricultural Expert</p>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>Hello ${data.farmerName}!</h2>
          <p>Great news! An agricultural expert has been assigned to help you with your farming needs.</p>
          
          <div style="background: white; padding: 15px; margin: 15px 0; border-radius: 5px;">
            <h3>Expert Details:</h3>
            <p><strong>Name:</strong> ${data.expertName}</p>
            <p><strong>Specialization:</strong> ${data.specialization}</p>
            <p><strong>Experience:</strong> ${data.experience} years</p>
            <p><strong>Contact:</strong> ${data.expertPhone}</p>
          </div>
          
          <p>Your expert will help you with:</p>
          <ul>
            <li>Soil analysis and recommendations</li>
            <li>Crop selection and planning</li>
            <li>Fertilizer and pest management</li>
            <li>Equipment usage guidance</li>
            <li>General farming advice</li>
          </ul>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${process.env.CLIENT_URL}/chat/${data.expertId}" style="background: #9C27B0; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Chat with Expert
            </a>
          </div>
        </div>
        
        <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
          <p>© 2024 Agro Connect. All rights reserved.</p>
          <p>If you have any questions, contact us at support@agroconnect.com</p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async ({ to, subject, html, template, data }) => {
  try {
    const transporter = createTransporter();
    
    let emailContent;
    
    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data);
    } else {
      emailContent = { subject, html };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Agro Connect <noreply@agroconnect.com>',
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

// Send bulk email
const sendBulkEmail = async (recipients, template, data) => {
  try {
    const transporter = createTransporter();
    const emailContent = emailTemplates[template](data);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Agro Connect <noreply@agroconnect.com>',
      bcc: recipients,
      subject: emailContent.subject,
      html: emailContent.html
    };
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Bulk email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId, recipientsCount: recipients.length };
    
  } catch (error) {
    console.error('Bulk email sending failed:', error);
    throw new Error('Failed to send bulk email');
  }
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  verifyEmailConfig,
  emailTemplates
};