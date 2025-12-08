import * as https from 'https';
import * as tls from 'tls';

/**
 * SSL 验证结果
 */
export interface SSLValidationResult {
  valid: boolean;
  issuer?: string;
  expiryDate?: Date;
  error?: string;
}

/**
 * SSL 验证器
 * 负责验证 SSL 证书的有效性
 */
export class SSLValidator {
  private customCA: string | undefined;

  /**
   * 验证 SSL 证书
   * @param url 目标 URL
   * @returns 验证结果
   */
  async validateCertificate(url: string): Promise<SSLValidationResult> {
    try {
      const parsedUrl = new URL(url);

      // 只验证 HTTPS 协议
      if (parsedUrl.protocol !== 'https:') {
        return {
          valid: true,
          error: 'Not an HTTPS URL, no SSL validation needed',
        };
      }

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        method: 'HEAD',
        timeout: 5000,
        rejectUnauthorized: true,
      };

      // 如果有自定义 CA 证书，添加到选项中
      if (this.customCA) {
        options.ca = this.customCA;
      }

      return await this.performValidation(options);
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 执行 SSL 验证
   * @param options 请求选项
   * @returns 验证结果
   */
  private performValidation(options: https.RequestOptions): Promise<SSLValidationResult> {
    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        const socket = res.socket as tls.TLSSocket;
        const cert = socket.getPeerCertificate();

        if (!cert || Object.keys(cert).length === 0) {
          resolve({
            valid: false,
            error: 'No certificate found',
          });
          return;
        }

        // 提取证书信息
        const issuer = cert.issuer
          ? `${cert.issuer.O || ''} ${cert.issuer.CN || ''}`.trim()
          : undefined;
        const expiryDate = cert.valid_to ? new Date(cert.valid_to) : undefined;

        // 检查证书是否过期
        const now = new Date();
        if (expiryDate && expiryDate < now) {
          resolve({
            valid: false,
            issuer,
            expiryDate,
            error: 'Certificate has expired',
          });
          return;
        }

        resolve({
          valid: true,
          issuer,
          expiryDate,
        });

        req.destroy();
      });

      req.on('error', (error) => {
        resolve({
          valid: false,
          error: error.message,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          valid: false,
          error: 'Connection timeout',
        });
      });

      req.end();
    });
  }

  /**
   * 设置自定义 CA 证书
   * @param caCert CA 证书内容
   */
  setCustomCA(caCert: string): void {
    this.customCA = caCert;
  }

  /**
   * 清除自定义 CA 证书
   */
  clearCustomCA(): void {
    this.customCA = undefined;
  }

  /**
   * 获取当前自定义 CA 证书
   * @returns CA 证书内容或 undefined
   */
  getCustomCA(): string | undefined {
    return this.customCA;
  }
}
