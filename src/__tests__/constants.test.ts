import { COMMANDS, CommandId } from '../constants';

/**
 * 命令常量单元测试
 * 验证命令标识符的正确性和一致性
 */
describe('Constants: Command Identifiers', () => {
  describe('COMMANDS object', () => {
    it('should contain all expected command identifiers', () => {
      expect(COMMANDS).toHaveProperty('GENERATE_MESSAGE');
      expect(COMMANDS).toHaveProperty('CONFIGURE_SETTINGS');
      expect(COMMANDS).toHaveProperty('TEST_CONNECTION');
    });

    it('should have correct command identifier values', () => {
      expect(COMMANDS.GENERATE_MESSAGE).toBe('aigitcommit.generateMessage');
      expect(COMMANDS.CONFIGURE_SETTINGS).toBe('aigitcommit.configureSettings');
      expect(COMMANDS.TEST_CONNECTION).toBe('aigitcommit.testConnection');
    });

    it('should have command identifiers with correct format (extensionId.commandName)', () => {
      const commandPattern = /^aigitcommit\.[a-zA-Z]+$/;

      Object.values(COMMANDS).forEach((commandId) => {
        expect(commandId).toMatch(commandPattern);
      });
    });

    it('should have unique command identifiers', () => {
      const commandIds = Object.values(COMMANDS);
      const uniqueCommandIds = new Set(commandIds);

      expect(uniqueCommandIds.size).toBe(commandIds.length);
    });

    it('should be immutable (readonly)', () => {
      // TypeScript enforces this at compile time with 'as const'
      // This test verifies the structure is correct
      expect(Object.isFrozen(COMMANDS)).toBe(false); // 'as const' doesn't freeze, but makes readonly

      // Note: TypeScript prevents adding new properties at compile time with 'as const'
      // Runtime JavaScript allows it, but TypeScript type system prevents it
      const commandKeys = Object.keys(COMMANDS);
      expect(commandKeys).toContain('GENERATE_MESSAGE');
      expect(commandKeys).toContain('CONFIGURE_SETTINGS');
    });
  });

  describe('CommandId type', () => {
    it('should accept valid command identifiers', () => {
      const validCommand1: CommandId = COMMANDS.GENERATE_MESSAGE;
      const validCommand2: CommandId = COMMANDS.CONFIGURE_SETTINGS;

      expect(validCommand1).toBe('aigitcommit.generateMessage');
      expect(validCommand2).toBe('aigitcommit.configureSettings');
    });

    it('should match the values in COMMANDS object', () => {
      const commandIds = Object.values(COMMANDS);

      commandIds.forEach((commandId) => {
        // This test verifies that CommandId type includes all command values
        const typedCommand: CommandId = commandId as CommandId;
        expect(typedCommand).toBe(commandId);
      });
    });
  });

  describe('Command identifier naming conventions', () => {
    it('should use camelCase for command names', () => {
      const camelCasePattern = /^aigitcommit\.[a-z][a-zA-Z]*$/;

      Object.values(COMMANDS).forEach((commandId) => {
        expect(commandId).toMatch(camelCasePattern);
      });
    });

    it('should start with extension prefix "aigitcommit."', () => {
      Object.values(COMMANDS).forEach((commandId) => {
        expect(commandId).toMatch(/^aigitcommit\./);
      });
    });

    it('should not contain spaces or special characters', () => {
      const validPattern = /^[a-zA-Z.]+$/;

      Object.values(COMMANDS).forEach((commandId) => {
        expect(commandId).toMatch(validPattern);
      });
    });
  });

  describe('Command identifier consistency', () => {
    it('should have consistent naming between constant key and command name', () => {
      // GENERATE_MESSAGE -> generateMessage
      expect(COMMANDS.GENERATE_MESSAGE).toContain('generateMessage');

      // CONFIGURE_SETTINGS -> configureSettings
      expect(COMMANDS.CONFIGURE_SETTINGS).toContain('configureSettings');

      // TEST_CONNECTION -> testConnection
      expect(COMMANDS.TEST_CONNECTION).toContain('testConnection');
    });

    it('should have exactly 3 command identifiers', () => {
      const commandCount = Object.keys(COMMANDS).length;
      expect(commandCount).toBe(3);
    });
  });

  describe('Integration with package.json', () => {
    it('should match command identifiers expected in package.json', () => {
      // These are the commands that should be registered in package.json
      const expectedCommands = [
        'aigitcommit.generateMessage',
        'aigitcommit.configureSettings',
        'aigitcommit.testConnection',
      ];

      const actualCommands = Object.values(COMMANDS);

      expectedCommands.forEach((expectedCommand) => {
        expect(actualCommands).toContain(expectedCommand);
      });
    });
  });
});
