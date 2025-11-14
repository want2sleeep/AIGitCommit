/**
 * 命令标识符常量
 */
export const COMMANDS = {
    /** 生成AI提交信息命令 */
    GENERATE_MESSAGE: 'aiGitCommit.generateMessage',
    
    /** 配置AI Git Commit命令 */
    CONFIGURE_SETTINGS: 'aiGitCommit.configureSettings'
} as const;

/**
 * 命令标识符类型
 */
export type CommandId = typeof COMMANDS[keyof typeof COMMANDS];
