import * as https from 'https';
import { SSLValidator } from '../SSLValidator';

// Mock https and tls modules
jest.mock('https');
jest.mock('tls');

describe('SSLValidator', () => {
  let sslValidator: SSLValidator;
  let mockHttpsRequest: jest.Mock;

  beforeEach(() => {
    sslValidator = new SSLValidator();
    mockHttpsRequest = https.request as jest.Mock;
    
    jest.clearAllMocks();
  });

  describe('validateCertificate', () => {
    it('should return valid result for non-HTTPS URLs', async () => {
      const url = 'http://example.com';
      
      const result = await sslValidator.validateCertificate(url);
      
      expect(result).toEqual({
        valid: true,
        error: 'Not an HTTPS URL, no SSL validation needed',
      });
    });

    it('should validate HTTPS URL successfully', async () => {
      const url = 'https://example.com';
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const mockCert = {
        issuer: { O: 'Test CA', CN: 'Test Certificate' },
        valid_to: futureDate.toISOString(),
      };
      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue(mockCert),
      };
      const mockResponse = {
        socket: mockSocket,
      };
      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };

      mockHttpsRequest.mockImplementation((_options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      // Simulate successful request - no error callback triggered
      const result = await sslValidator.validateCertificate(url);
      
      expect(result.valid).toBe(true);
      expect(result.issuer).toBe('Test CA Test Certificate');
      expect(result.expiryDate).toBeInstanceOf(Date);
    });

    it('should handle expired certificates', async () => {
      const url = 'https://example.com';
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      
      const mockCert = {
        issuer: { O: 'Test CA', CN: 'Test Certificate' },
        valid_to: pastDate.toISOString(),
      };
      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue(mockCert),
      };
      const mockResponse = {
        socket: mockSocket,
      };
      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };

      mockHttpsRequest.mockImplementation((_options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await sslValidator.validateCertificate(url);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Certificate has expired');
      expect(result.issuer).toBe('Test CA Test Certificate');
    });

    it('should handle missing certificates', async () => {
      const url = 'https://example.com';
      const mockSocket = {
        getPeerCertificate: jest.fn().mockReturnValue({}),
      };
      const mockResponse = {
        socket: mockSocket,
      };
      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };

      mockHttpsRequest.mockImplementation((_options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      const result = await sslValidator.validateCertificate(url);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No certificate found');
    });

    it('should handle connection errors', async () => {
      const url = 'https://example.com';
      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };

      mockHttpsRequest.mockReturnValue(mockRequest);

      // Simulate error
      setTimeout(() => {
        const errorCallback = mockRequest.on.mock.calls.find(
          (call) => call[0] === 'error'
        );
        if (errorCallback) {
          errorCallback[1](new Error('Connection failed'));
        }
      }, 0);

      const result = await sslValidator.validateCertificate(url);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should handle timeout', async () => {
      const url = 'https://example.com';
      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };

      mockHttpsRequest.mockReturnValue(mockRequest);

      // Simulate timeout
      setTimeout(() => {
        const timeoutCallback = mockRequest.on.mock.calls.find(
          (call) => call[0] === 'timeout'
        );
        if (timeoutCallback) {
          timeoutCallback[1]();
        }
      }, 0);

      const result = await sslValidator.validateCertificate(url);
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });

    it('should use custom CA certificate when set', async () => {
      const url = 'https://example.com';
      const customCA = '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----';
      
      sslValidator.setCustomCA(customCA);
      
      const mockResponse = {
        socket: {
          getPeerCertificate: jest.fn().mockReturnValue({
            issuer: { O: 'Test CA', CN: 'Test Certificate' },
            valid_to: '2024-12-31T23:59:59.000Z',
          }),
        },
      };
      const mockRequest = {
        on: jest.fn(),
        destroy: jest.fn(),
        end: jest.fn(),
      };

      mockHttpsRequest.mockImplementation((_options, callback) => {
        callback(mockResponse);
        return mockRequest;
      });

      await sslValidator.validateCertificate(url);
      
      expect(mockHttpsRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          ca: customCA,
        }),
        expect.any(Function)
      );
    });

    it('should handle invalid URLs', async () => {
      const url = 'invalid-url';
      
      const result = await sslValidator.validateCertificate(url);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL');
    });
  });

  describe('setCustomCA', () => {
    it('should set custom CA certificate', () => {
      const customCA = '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----';
      
      sslValidator.setCustomCA(customCA);
      
      expect(sslValidator.getCustomCA()).toBe(customCA);
    });
  });

  describe('clearCustomCA', () => {
    it('should clear custom CA certificate', () => {
      const customCA = '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----';
      sslValidator.setCustomCA(customCA);
      
      sslValidator.clearCustomCA();
      
      expect(sslValidator.getCustomCA()).toBeUndefined();
    });
  });

  describe('getCustomCA', () => {
    it('should return undefined when no custom CA is set', () => {
      const result = sslValidator.getCustomCA();
      
      expect(result).toBeUndefined();
    });

    it('should return custom CA when set', () => {
      const customCA = '-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----';
      sslValidator.setCustomCA(customCA);
      
      const result = sslValidator.getCustomCA();
      
      expect(result).toBe(customCA);
    });
  });
});