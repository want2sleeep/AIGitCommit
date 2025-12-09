import * as vscode from 'vscode';
import { WelcomePageManager } from '../WelcomePageManager';
import type { ServiceContainer } from '../ServiceContainer';

// Mock vscode module
jest.mock('vscode', () => ({
  window: {
    createWebviewPanel: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
  },
  ViewColumn: {
    One: 1,
  },
  ProgressLocation: {
    Notification: 1,
  },
}));

describe('WelcomePageManager', () => {
  let welcomePageManager: WelcomePageManager;
  let mockContext: vscode.ExtensionContext;
  let mockServiceContainer: ServiceContainer;
  let mockGlobalState: vscode.Memento;
  let mockSubscriptions: vscode.Disposable[];
  let mockWebviewPanel: vscode.WebviewPanel;
  let mockConfigPanelManager: any;

  beforeEach(() => {
    mockGlobalState = {
      get: jest.fn(),
      update: jest.fn(),
    } as any;

    mockSubscriptions = [];
    
    mockContext = {
      globalState: mockGlobalState,
      subscriptions: mockSubscriptions,
    } as any;

    mockConfigPanelManager = {
      showPanel: jest.fn().mockResolvedValue(undefined),
    };

    mockServiceContainer = {
      resolve: jest.fn().mockReturnValue(mockConfigPanelManager),
    } as any;

    mockWebviewPanel = {
      reveal: jest.fn(),
      webview: {
        html: '',
        onDidReceiveMessage: jest.fn(),
      },
      onDidDispose: jest.fn(),
      dispose: jest.fn(),
    } as any;

    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockWebviewPanel);

    welcomePageManager = new WelcomePageManager(mockContext, mockServiceContainer);
    
    jest.clearAllMocks();
  });

  describe('shouldShowWelcome', () => {
    it('should return true when welcome has not been shown', () => {
      (mockGlobalState.get as jest.Mock).mockReturnValue(false);
      
      const result = welcomePageManager.shouldShowWelcome();
      
      expect(result).toBe(true);
      expect(mockGlobalState.get).toHaveBeenCalledWith('aigitcommit.welcomeShown', false);
    });

    it('should return false when welcome has already been shown', () => {
      (mockGlobalState.get as jest.Mock).mockReturnValue(true);
      
      const result = welcomePageManager.shouldShowWelcome();
      
      expect(result).toBe(false);
    });
  });

  describe('showWelcome', () => {
    it('should reveal existing panel if already open', () => {
      // Set up existing panel
      (welcomePageManager as any).panel = mockWebviewPanel;
      
      welcomePageManager.showWelcome();
      
      expect(mockWebviewPanel.reveal).toHaveBeenCalled();
      expect(vscode.window.createWebviewPanel).not.toHaveBeenCalled();
    });

    it('should create new webview panel when none exists', () => {
      welcomePageManager.showWelcome();
      
      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'aigitcommitWelcome',
        'Welcome to AI Git Commit',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );
    });

    it('should set up message handlers', () => {
      welcomePageManager.showWelcome();
      
      expect(mockWebviewPanel.webview.onDidReceiveMessage).toHaveBeenCalled();
      expect(mockWebviewPanel.onDidDispose).toHaveBeenCalled();
    });

    it('should handle startConfiguration message', async () => {
      const mockCallback = jest.fn();
      (mockWebviewPanel.webview.onDidReceiveMessage as jest.Mock).mockImplementation(
        (callback) => {
          mockCallback.mockImplementation(callback);
        }
      );

      welcomePageManager.showWelcome();
      
      // Simulate message
      await mockCallback({ type: 'startConfiguration' });
      
      expect(mockGlobalState.update).toHaveBeenCalledWith('aigitcommit.welcomeShown', true);
      expect(mockWebviewPanel.dispose).toHaveBeenCalled();
      expect(mockServiceContainer.resolve).toHaveBeenCalledWith('configurationPanelManager');
      expect(mockConfigPanelManager.showPanel).toHaveBeenCalled();
    });

    it('should handle closeWelcome message', async () => {
      const mockCallback = jest.fn();
      (mockWebviewPanel.webview.onDidReceiveMessage as jest.Mock).mockImplementation(
        (callback) => {
          mockCallback.mockImplementation(callback);
        }
      );

      welcomePageManager.showWelcome();
      
      // Simulate message
      await mockCallback({ type: 'closeWelcome' });
      
      expect(mockGlobalState.update).toHaveBeenCalledWith('aigitcommit.welcomeShown', true);
      expect(mockWebviewPanel.dispose).toHaveBeenCalled();
    });
  });

  describe('markWelcomeShown', () => {
    it('should update global state to mark welcome as shown', async () => {
      await welcomePageManager.markWelcomeShown();
      
      expect(mockGlobalState.update).toHaveBeenCalledWith('aigitcommit.welcomeShown', true);
    });
  });

  describe('getWelcomeContent', () => {
    it('should generate HTML content with proper structure', () => {
      welcomePageManager.showWelcome();
      
      expect(mockWebviewPanel.webview.html).toContain('<!DOCTYPE html>');
      expect(mockWebviewPanel.webview.html).toContain('Welcome to AI Git Commit');
      expect(mockWebviewPanel.webview.html).toContain('开始配置');
      expect(mockWebviewPanel.webview.html).toContain('稍后配置');
      expect(mockWebviewPanel.webview.html).toContain('startConfiguration()');
      expect(mockWebviewPanel.webview.html).toContain('closeWelcome()');
    });
  });

  describe('panel disposal', () => {
    it('should clean up panel reference on dispose', () => {
      const mockCallback = jest.fn();
      (mockWebviewPanel.onDidDispose as jest.Mock).mockImplementation(
        (callback) => {
          mockCallback.mockImplementation(callback);
        }
      );

      welcomePageManager.showWelcome();
      
      // Simulate dispose event
      mockCallback();
      
      expect((welcomePageManager as any).panel).toBeUndefined();
    });
  });
});