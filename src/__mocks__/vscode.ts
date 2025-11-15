// Mock implementation of vscode module for testing
export const workspace = {
  getConfiguration: jest.fn(),
  onDidChangeConfiguration: jest.fn(),
};

export const window = {
  showInputBox: jest.fn(),
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  withProgress: jest.fn(),
  createOutputChannel: jest.fn(),
  createStatusBarItem: jest.fn(),
};

export enum ConfigurationTarget {
  Global = 1,
  Workspace = 2,
  WorkspaceFolder = 3,
}

export enum ProgressLocation {
  SourceControl = 1,
  Window = 10,
  Notification = 15,
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2,
}

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
}

export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};

export class Uri {
  fsPath: string;
  path: string;
  scheme: string;
  authority: string;
  query: string;
  fragment: string;

  constructor(scheme: string, authority: string, path: string, query: string, fragment: string) {
    this.scheme = scheme;
    this.authority = authority;
    this.path = path;
    this.query = query;
    this.fragment = fragment;
    this.fsPath = path;
  }

  static file(path: string): Uri {
    return new Uri('file', '', path, '', '');
  }

  static parse(uri: string): Uri {
    return new Uri('file', '', uri, '', '');
  }

  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri {
    return new Uri(
      change.scheme ?? this.scheme,
      change.authority ?? this.authority,
      change.path ?? this.path,
      change.query ?? this.query,
      change.fragment ?? this.fragment
    );
  }

  toString(): string {
    return `${this.scheme}://${this.authority}${this.path}`;
  }
}

export const extensions = {
  getExtension: jest.fn(),
};

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  get event(): (listener: (e: T) => void) => { dispose: () => void } {
    return (listener: (e: T) => void): { dispose: () => void } => {
      this.listeners.push(listener);
      return {
        dispose: (): void => {
          const index = this.listeners.indexOf(listener);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
        },
      };
    };
  }

  fire(data: T): void {
    this.listeners.forEach((listener) => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}
