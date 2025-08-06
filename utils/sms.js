const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// SMS templates
const smsTemplates = {
  welcome: (data) => `Welcome to Agro Connect! Your account has been created successfully. Your role: ${data.role}. Visit ${process.env.CLIENT_URL} to get started.`,
  
  passwordReset: (data) => `Your Agro Connect password reset code is: ${data.resetToken}. Valid for 10 minutes. Do not share this code with anyone.`,
  
  bookingConfirmation: (data) => `Booking confirmed! ID: ${data.bookingId}, Equipment: ${data.equipmentName}, Date: ${data.startDate}, Amount: ₹${data.totalAmount}. Check your email for details.`,
  
  bookingReminder: (data) => `Reminder: Your equipment booking (${data.bookingId}) is scheduled for tomorrow. Equipment: ${data.equipmentName}. Please ensure you're ready for pickup.`,
  
  expertAssignment: (data) => `Great news! Expert ${data.expertName} has been assigned to help you. Contact: ${data.expertPhone}. Start chatting at ${process.env.CLIENT_URL}/chat`,
  
  paymentSuccess: (data) => `Payment successful! Amount: ₹${data.amount}, Transaction ID: ${data.transactionId}. Thank you for using Agro Connect.`,
  
  paymentFailed: (data) => `Payment failed for booking ${data.bookingId}. Please try again or contact support. Amount: ₹${data.amount}`,
  
  equipmentAvailable: (data) => `Equipment ${data.equipmentName} is now available in your area! Price: ₹${data.price}/day. Book now at ${process.env.CLIENT_URL}/equipment`,
  
  weatherAlert: (data) => `Weather Alert: ${data.condition} expected in your area. ${data.recommendation}. Stay safe and protect your crops.`,
  
  soilReportReady: (data) => `Your soil analysis report is ready! Check your dashboard for detailed recommendations and crop suggestions.`,
  
  chatMessage: (data) => `New message from ${data.senderName}: ${data.message.substring(0, 50)}${data.message.length > 50 ? '...' : ''}. Reply at ${process.env.CLIENT_URL}/chat`,
  
  systemMaintenance: (data) => `Scheduled maintenance: Agro Connect will be unavailable from ${data.startTime} to ${data.endTime}. We apologize for any inconvenience.`,
  
  accountVerification: (data) => `Your Agro Connect verification code is: ${data.verificationCode}. Enter this code to verify your account.`,
  
  expertAvailability: (data) => `Your assigned expert ${data.expertName} is now ${data.availability}. You can chat with them anytime.`,
  
  cropCalendar: (data) => `Crop Calendar Alert: ${data.cropName} should be ${data.action} this week. Check your calendar for detailed schedule.`,
  
  equipmentReturn: (data) => `Reminder: Equipment ${data.equipmentName} (Booking ${data.bookingId}) is due for return on ${data.returnDate}. Please ensure timely return.`,
  
  supportTicket: (data) => `Support ticket #${data.ticketId} has been created. We'll respond within 24 hours. You can track status at ${process.env.CLIENT_URL}/support`,
  
  supportResponse: (data) => `Response to ticket #${data.ticketId}: ${data.response.substring(0, 100)}${data.response.length > 100 ? '...' : ''}. Check full response in your dashboard.`
};

// Send SMS function
const sendSMS = async ({ to, message, template, data }) => {
  try {
    let smsContent;
    
    if (template && smsTemplates[template]) {
      smsContent = smsTemplates[template](data);
    } else {
      smsContent = message;
    }
    
    // Format phone number (ensure it starts with +91 for India)
    let formattedNumber = to;
    if (!formattedNumber.startsWith('+')) {
      if (formattedNumber.startsWith('91')) {
        formattedNumber = '+' + formattedNumber;
      } else if (formattedNumber.startsWith('0')) {
        formattedNumber = '+91' + formattedNumber.substring(1);
      } else {
        formattedNumber = '+91' + formattedNumber;
      }
    }
    
    const messageData = await client.messages.create({
      body: smsContent,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedNumber
    });
    
    console.log('SMS sent successfully:', messageData.sid);
    return { 
      success: true, 
      messageId: messageData.sid,
      status: messageData.status,
      to: formattedNumber
    };
    
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

// Send bulk SMS
const sendBulkSMS = async (recipients, template, data) => {
  try {
    const results = [];
    const smsContent = smsTemplates[template](data);
    
    for (const recipient of recipients) {
      try {
        let formattedNumber = recipient;
        if (!formattedNumber.startsWith('+')) {
          if (formattedNumber.startsWith('91')) {
            formattedNumber = '+' + formattedNumber;
          } else if (formattedNumber.startsWith('0')) {
            formattedNumber = '+91' + formattedNumber.substring(1);
          } else {
            formattedNumber = '+91' + formattedNumber;
          }
        }
        
        const messageData = await client.messages.create({
          body: smsContent,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedNumber
        });
        
        results.push({
          phone: recipient,
          success: true,
          messageId: messageData.sid,
          status: messageData.status
        });
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        results.push({
          phone: recipient,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log(`Bulk SMS completed: ${successCount} successful, ${failureCount} failed`);
    
    return {
      success: true,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    };
    
  } catch (error) {
    console.error('Bulk SMS sending failed:', error);
    throw new Error(`Failed to send bulk SMS: ${error.message}`);
  }
};

// Verify phone number
const verifyPhoneNumber = async (phoneNumber, code) => {
  try {
    let formattedNumber = phoneNumber;
    if (!formattedNumber.startsWith('+')) {
      if (formattedNumber.startsWith('91')) {
        formattedNumber = '+' + formattedNumber;
      } else if (formattedNumber.startsWith('0')) {
        formattedNumber = '+91' + formattedNumber.substring(1);
      } else {
        formattedNumber = '+91' + formattedNumber;
      }
    }
    
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: formattedNumber,
        code: code
      });
    
    return {
      success: verificationCheck.status === 'approved',
      status: verificationCheck.status,
      valid: verificationCheck.valid
    };
    
  } catch (error) {
    console.error('Phone verification failed:', error);
    throw new Error(`Phone verification failed: ${error.message}`);
  }
};

// Send verification code
const sendVerificationCode = async (phoneNumber) => {
  try {
    let formattedNumber = phoneNumber;
    if (!formattedNumber.startsWith('+')) {
      if (formattedNumber.startsWith('91')) {
        formattedNumber = '+' + formattedNumber;
      } else if (formattedNumber.startsWith('0')) {
        formattedNumber = '+91' + formattedNumber.substring(1);
      } else {
        formattedNumber = '+91' + formattedNumber;
      }
    }
    
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: formattedNumber,
        channel: 'sms'
      });
    
    return {
      success: true,
      status: verification.status,
      sid: verification.sid
    };
    
  } catch (error) {
    console.error('Verification code sending failed:', error);
    throw new Error(`Failed to send verification code: ${error.message}`);
  }
};

// Check SMS delivery status
const checkSMSStatus = async (messageId) => {
  try {
    const message = await client.messages(messageId).fetch();
    
    return {
      success: true,
      status: message.status,
      direction: message.direction,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    };
    
  } catch (error) {
    console.error('SMS status check failed:', error);
    throw new Error(`Failed to check SMS status: ${error.message}`);
  }
};

// Get SMS history
const getSMSHistory = async (phoneNumber, limit = 50) => {
  try {
    let formattedNumber = phoneNumber;
    if (!formattedNumber.startsWith('+')) {
      if (formattedNumber.startsWith('91')) {
        formattedNumber = '+' + formattedNumber;
      } else if (formattedNumber.startsWith('0')) {
        formattedNumber = '+91' + formattedNumber.substring(1);
      } else {
        formattedNumber = '+91' + formattedNumber;
      }
    }
    
    const messages = await client.messages.list({
      to: formattedNumber,
      limit: limit
    });
    
    return messages.map(message => ({
      sid: message.sid,
      status: message.status,
      direction: message.direction,
      body: message.body,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    }));
    
  } catch (error) {
    console.error('SMS history fetch failed:', error);
    throw new Error(`Failed to fetch SMS history: ${error.message}`);
  }
};

// Verify Twilio configuration
const verifyTwilioConfig = async () => {
  try {
    // Try to fetch account details to verify credentials
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log('Twilio configuration is valid');
    return {
      success: true,
      accountName: account.friendlyName,
      status: account.status
    };
  } catch (error) {
    console.error('Twilio configuration error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendSMS,
  sendBulkSMS,
  verifyPhoneNumber,
  sendVerificationCode,
  checkSMSStatus,
  getSMSHistory,
  verifyTwilioConfig,
  smsTemplates
};