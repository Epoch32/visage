/**
 * Options for the automated static hosting headers plugin
 */
export interface HeadersPluginOptions {
  /**
   * Whether to enable automatic _headers generation
   * @default true
   */
  enabled?: boolean;

  /**
   * Cache-Control directive for hashed assets under /assets/* (RFC 8246)
   * @default "public, max-age=31536000, immutable"
   */
  assetsCacheControl?: string;

  /**
   * Cache-Control directive for root documents and HTML shells under /* (RFC 9111)
   * @default "public, max-age=0, must-revalidate"
   */
  documentCacheControl?: string;

  /**
   * Additional custom header blocks or rules to include in _headers
   */
  customRules?: Record<string, Record<string, string>>;
}
