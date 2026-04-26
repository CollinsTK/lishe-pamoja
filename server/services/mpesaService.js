/**
 * M-Pesa Integration Service
 * Supports STK Push (payments) and B2C (payouts)
 * Uses Daraja API 2.0
 */

const axios = require('axios');
const crypto = require('crypto');

// M-Pesa API endpoints
const MPESA_ENDPOINTS = {
  sandbox: {
    baseUrl: 'https://sandbox.safaricom.co.ke',
    auth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkStatus: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/queryrequest',
    b2c: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
    b2cStatus: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/query',
    c2bRegister: 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl',
    c2bSimulate: 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate',
    reversal: 'https://sandbox.safaricom.co.ke/mpesa/reversal/v1/request',
  },
  production: {
    baseUrl: 'https://api.safaricom.co.ke',
    auth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkPush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    stkStatus: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/queryrequest',
    b2c: 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
    b2cStatus: 'https://api.safaricom.co.ke/mpesa/b2c/v1/query',
    c2bRegister: 'https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl',
    c2bSimulate: 'https://api.safaricom.co.ke/mpesa/c2b/v1/simulate',
    reversal: 'https://api.safaricom.co.ke/mpesa/reversal/v1/request',
  },
};

class MpesaService {
  constructor(config = {}) {
    this.environment = config.environment || 'sandbox';
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.shortcode = config.shortcode;
    this.passkey = config.passkey;
    this.initiatorName = config.initiatorName;
    this.securityCredential = config.securityCredential;
    
    this.endpoints = MPESA_ENDPOINTS[this.environment];
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Format date to M-Pesa timestamp format (yyyyMMddhhmmss)
   */
  formatTimestamp(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Get access token for M-Pesa API
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    // Mock response for dummy credentials
    if (this.consumerKey === 'your_consumer_key_here') {
      this.accessToken = 'mock_access_token_12345';
      this.tokenExpiry = new Date(Date.now() + 3599 * 1000);
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');

    try {
      const response = await axios.get(this.endpoints.auth, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      this.accessToken = response.data.access_token;
      // Set expiry with 1 minute buffer
      this.tokenExpiry = new Date(Date.now() + (response.data.expires_in - 60) * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('M-Pesa Auth Error:', error.response?.data || error.message);
      throw new Error(`Failed to get M-Pesa access token: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Generate STK Push password
   */
  generateSTKPassword() {
    const timestamp = this.formatTimestamp();
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  /**
   * Initiate STK Push payment request
   * @param {string} phone - Customer phone number (2547XXXXXXXX)
   * @param {number} amount - Amount to pay
   * @param {string} accountReference - Your account reference
   * @param {string} transactionDesc - Transaction description
   * @param {string} callBackUrl - Callback URL for results
   */
  async initiateSTKPush({ phone, amount, accountReference, transactionDesc, callBackUrl }) {
    const token = await this.getAccessToken();
    const { password, timestamp } = this.generateSTKPassword();

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: this.shortcode,
      PhoneNumber: phone,
      CallBackURL: callBackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc || 'Lishe Pamoja Payment',
    };

    try {
      // Mock STK Push for dummy credentials
      if (this.consumerKey === 'your_consumer_key_here') {
        console.log(`[MOCK MPESA] STK Push initiated to ${phone} for KES ${amount}`);
        // Auto-simulate callback success after 5 seconds
        setTimeout(async () => {
          try {
            await axios.post(callBackUrl, {
              MerchantRequestID: `MOCK_REQ_${Date.now()}`,
              CheckoutRequestID: `MOCK_CHK_${Date.now()}`,
              ResultCode: 0,
              ResultDesc: 'The service request is processed successfully.',
              Amount: amount,
              MpesaReceiptNumber: `MOCK_REC_${Math.floor(Math.random() * 1000000)}`,
              PhoneNumber: phone
            });
            console.log(`[MOCK MPESA] Auto-simulated callback sent to ${callBackUrl}`);
          } catch (e) {
            console.error(`[MOCK MPESA] Auto-simulated callback failed:`, e.message);
          }
        }, 5000);

        return {
          success: true,
          merchantRequestId: `MOCK_REQ_${Date.now()}`,
          checkoutRequestId: `MOCK_CHK_${Date.now()}`,
          responseCode: '0',
          responseDescription: 'Success. Request accepted for processing',
        };
      }

      const response = await axios.post(this.endpoints.stkPush, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
      };
    } catch (error) {
      console.error('STK Push Error:', error.response?.data || error.message);
      throw new Error(`STK Push failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Check STK Push payment status
   * @param {string} checkoutRequestId - Checkout request ID from STK Push
   */
  async checkSTKStatus(checkoutRequestId) {
    const token = await this.getAccessToken();
    const { password, timestamp } = this.generateSTKPassword();

    const payload = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };

    try {
      const response = await axios.post(this.endpoints.stkStatus, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc,
        merchantRequestId: response.data.MerchantRequestID,
        checkoutRequestId: response.data.CheckoutRequestID,
      };
    } catch (error) {
      console.error('STK Status Check Error:', error.response?.data || error.message);
      throw new Error(`STK Status check failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Send B2C payment (payout to vendor/logistics)
   * @param {string} phone - Recipient phone number (2547XXXXXXXX)
   * @param {number} amount - Amount to send
   * @param {string} commandId - Command ID (BusinessPayment, SalaryPayment, PromotionPayment)
   * @param {string} occasion - Occasion for the payment
   * @param {string} callBackUrl - Callback URL for results
   */
  async sendB2CPayment({ phone, amount, commandId = 'BusinessPayment', occasion = 'Payout', callBackUrl }) {
    const token = await this.getAccessToken();

    const payload = {
      InitiatorName: this.initiatorName,
      SecurityCredential: this.securityCredential,
      CommandID: commandId,
      Amount: Math.round(amount),
      PartyA: this.shortcode,
      PartyB: phone,
      Remarks: 'Lishe Pamoja Payout',
      QueueTimeOutURL: `${callBackUrl}/timeout`,
      ResultURL: callBackUrl,
      Occasion: occasion,
    };

    try {
      const response = await axios.post(this.endpoints.b2c, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        conversationId: response.data.ConversationID,
        originatorConversationId: response.data.OriginatorConversationID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
      };
    } catch (error) {
      console.error('B2C Payment Error:', error.response?.data || error.message);
      throw new Error(`B2C Payment failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Check B2C payment status
   * @param {string} conversationId - Conversation ID from B2C request
   */
  async checkB2CStatus(conversationId) {
    const token = await this.getAccessToken();

    const payload = {
      ConversationID: conversationId,
      InitiatorName: this.initiatorName,
      SecurityCredential: this.securityCredential,
    };

    try {
      const response = await axios.post(this.endpoints.b2cStatus, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      console.error('B2C Status Check Error:', error.response?.data || error.message);
      throw new Error(`B2C Status check failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Register C2B callback URL (for STK Push callbacks)
   * @param {string} validationUrl - Validation URL
   * @param {string} confirmationUrl - Confirmation URL
   */
  async registerC2BUrls(validationUrl, confirmationUrl) {
    const token = await this.getAccessToken();

    const payload = {
      ShortCode: this.shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    };

    try {
      const response = await axios.post(this.endpoints.c2bRegister, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        success: true,
        ...response.data,
      };
    } catch (error) {
      console.error('C2B Register Error:', error.response?.data || error.message);
      throw new Error(`C2B Register failed: ${error.response?.data?.errorMessage || error.message}`);
    }
  }

  /**
   * Format phone number to M-Pesa format (2547XXXXXXXX)
   */
  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Convert to M-Pesa format
    if (cleaned.startsWith('0')) {
      return `254${cleaned.slice(1)}`;
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      return `254${cleaned}`;
    }
    return `254${cleaned}`;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return /^254[7-9]\d{8}$/.test(cleaned) || /^0[7-9]\d{8}$/.test(cleaned);
  }
}

module.exports = MpesaService;