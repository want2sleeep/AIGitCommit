import {
  isValidConfig,
  isGitChange,
  isChangeStatus,
  isAPIError,
  isConfigurationError,
  isGitOperationError,
  isNetworkError,
  isBaseError,
  isValidationResult,
  isNonEmptyString,
  isGitChangeArray,
  isError,
  assertValidConfig,
  assertGitChange,
} from '../typeGuards';
import { ChangeStatus } from '../../types';
import { APIError, ConfigurationError, GitOperationError, NetworkError } from '../../errors';

describe('typeGuards', () => {
  describe('isValidConfig', () => {
    it('should return true for valid config', () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      };
      expect(isValidConfig(config)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidConfig(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidConfig('string')).toBe(false);
      expect(isValidConfig(123)).toBe(false);
    });

    it('should return false for missing fields', () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key',
      };
      expect(isValidConfig(config)).toBe(false);
    });

    it('should return false for wrong types', () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: '500', // wrong type
        temperature: 0.7,
      };
      expect(isValidConfig(config)).toBe(false);
    });
  });

  describe('isGitChange', () => {
    it('should return true for valid GitChange', () => {
      const change = {
        path: 'src/test.ts',
        status: ChangeStatus.Modified,
        diff: 'diff content',
        additions: 10,
        deletions: 5,
      };
      expect(isGitChange(change)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isGitChange(null)).toBe(false);
    });

    it('should return false for missing fields', () => {
      const change = {
        path: 'src/test.ts',
        status: ChangeStatus.Modified,
      };
      expect(isGitChange(change)).toBe(false);
    });

    it('should return false for invalid status', () => {
      const change = {
        path: 'src/test.ts',
        status: 'invalid',
        diff: 'diff content',
        additions: 10,
        deletions: 5,
      };
      expect(isGitChange(change)).toBe(false);
    });
  });

  describe('isChangeStatus', () => {
    it('should return true for valid ChangeStatus values', () => {
      expect(isChangeStatus(ChangeStatus.Added)).toBe(true);
      expect(isChangeStatus(ChangeStatus.Modified)).toBe(true);
      expect(isChangeStatus(ChangeStatus.Deleted)).toBe(true);
      expect(isChangeStatus(ChangeStatus.Renamed)).toBe(true);
      expect(isChangeStatus(ChangeStatus.Copied)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isChangeStatus('invalid')).toBe(false);
      expect(isChangeStatus(123)).toBe(false);
      expect(isChangeStatus(null)).toBe(false);
    });
  });

  describe('error type guards', () => {
    it('isAPIError should identify APIError', () => {
      const error = new APIError('test', 500);
      expect(isAPIError(error)).toBe(true);
      expect(isAPIError(new Error('test'))).toBe(false);
    });

    it('isConfigurationError should identify ConfigurationError', () => {
      const error = new ConfigurationError('test', 'field');
      expect(isConfigurationError(error)).toBe(true);
      expect(isConfigurationError(new Error('test'))).toBe(false);
    });

    it('isGitOperationError should identify GitOperationError', () => {
      const error = new GitOperationError('test', 'operation');
      expect(isGitOperationError(error)).toBe(true);
      expect(isGitOperationError(new Error('test'))).toBe(false);
    });

    it('isNetworkError should identify NetworkError', () => {
      const error = new NetworkError('test');
      expect(isNetworkError(error)).toBe(true);
      expect(isNetworkError(new Error('test'))).toBe(false);
    });

    it('isBaseError should identify any BaseError', () => {
      expect(isBaseError(new APIError('test', 500))).toBe(true);
      expect(isBaseError(new ConfigurationError('test', 'field'))).toBe(true);
      expect(isBaseError(new GitOperationError('test', 'op'))).toBe(true);
      expect(isBaseError(new NetworkError('test'))).toBe(true);
      expect(isBaseError(new Error('test'))).toBe(false);
    });
  });

  describe('isValidationResult', () => {
    it('should return true for valid ValidationResult', () => {
      const result = {
        valid: true,
        errors: [],
      };
      expect(isValidationResult(result)).toBe(true);
    });

    it('should return true for invalid result with errors', () => {
      const result = {
        valid: false,
        errors: ['error 1', 'error 2'],
      };
      expect(isValidationResult(result)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidationResult(null)).toBe(false);
    });

    it('should return false for missing fields', () => {
      const result = {
        valid: true,
      };
      expect(isValidationResult(result)).toBe(false);
    });

    it('should return false for non-string errors', () => {
      const result = {
        valid: false,
        errors: [123, 456],
      };
      expect(isValidationResult(result)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('test')).toBe(true);
      expect(isNonEmptyString('  test  ')).toBe(true);
    });

    it('should return false for empty or whitespace strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe('isGitChangeArray', () => {
    it('should return true for valid GitChange array', () => {
      const changes = [
        {
          path: 'src/test1.ts',
          status: ChangeStatus.Modified,
          diff: 'diff1',
          additions: 10,
          deletions: 5,
        },
        {
          path: 'src/test2.ts',
          status: ChangeStatus.Added,
          diff: 'diff2',
          additions: 20,
          deletions: 0,
        },
      ];
      expect(isGitChangeArray(changes)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(isGitChangeArray([])).toBe(true);
    });

    it('should return false for non-array', () => {
      expect(isGitChangeArray('not array')).toBe(false);
    });

    it('should return false for array with invalid items', () => {
      const changes = [
        {
          path: 'src/test1.ts',
          status: ChangeStatus.Modified,
          diff: 'diff1',
          additions: 10,
          deletions: 5,
        },
        { invalid: 'object' },
      ];
      expect(isGitChangeArray(changes)).toBe(false);
    });
  });

  describe('isError', () => {
    it('should return true for Error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError(new TypeError('test'))).toBe(true);
    });

    it('should return false for non-Error values', () => {
      expect(isError('error string')).toBe(false);
      expect(isError({ message: 'error' })).toBe(false);
      expect(isError(null)).toBe(false);
    });
  });

  describe('assertValidConfig', () => {
    it('should not throw for valid config', () => {
      const config = {
        apiEndpoint: 'https://api.openai.com/v1',
        apiKey: 'test-key',
        modelName: 'gpt-3.5-turbo',
        language: 'zh-CN',
        commitFormat: 'conventional',
        maxTokens: 500,
        temperature: 0.7,
      };
      expect(() => assertValidConfig(config)).not.toThrow();
    });

    it('should throw ConfigurationError for invalid config', () => {
      const config = { invalid: 'config' };
      expect(() => assertValidConfig(config)).toThrow(ConfigurationError);
    });

    it('should throw with custom error message', () => {
      const config = { invalid: 'config' };
      expect(() => assertValidConfig(config, 'Custom error')).toThrow('Custom error');
    });
  });

  describe('assertGitChange', () => {
    it('should not throw for valid GitChange', () => {
      const change = {
        path: 'src/test.ts',
        status: ChangeStatus.Modified,
        diff: 'diff content',
        additions: 10,
        deletions: 5,
      };
      expect(() => assertGitChange(change)).not.toThrow();
    });

    it('should throw GitOperationError for invalid change', () => {
      const change = { invalid: 'change' };
      expect(() => assertGitChange(change)).toThrow(GitOperationError);
    });

    it('should throw with custom error message', () => {
      const change = { invalid: 'change' };
      expect(() => assertGitChange(change, 'Custom error')).toThrow('Custom error');
    });
  });
});
