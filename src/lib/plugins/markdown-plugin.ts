/**
 * Markdown format plugin for parsing and generating Markdown translation files
 */

import {
  FormatPlugin,
  TranslationStrings,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  PluginError
} from '../types/plugin.js';

/**
 * Markdown format plugin implementation
 * Supports structured markdown with headers and key-value pairs
 */
export class MarkdownPlugin implements FormatPlugin {
  readonly name = 'markdown-plugin';
  readonly version = '1.0.0';
  readonly supportedFormats = ['markdown', 'md'];

  /**
   * Parse Markdown content into translation strings
   * Supports format:
   * # Section
   * ## Subsection
   * - key: value
   * - nested.key: value
   * 
   * @param content Markdown content to parse
   * @returns Parsed translation strings with nested structure
   */
  parse(content: string): TranslationStrings {
    try {
      if (!content.trim()) {
        return {};
      }

      const lines = content.split('\n');
      const result: TranslationStrings = {};
      const sectionStack: string[] = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;

        // Skip empty lines and comments
        if (!line || line.startsWith('<!--')) {
          continue;
        }

        // Handle headers (sections)
        if (line.startsWith('#')) {
          const headerMatch = line.match(/^(#+)\s*(.+)$/);
          if (headerMatch) {
            const level = headerMatch[1].length;
            const title = headerMatch[2].trim();
            
            // Update section stack based on header level
            sectionStack.splice(level - 1);
            sectionStack[level - 1] = this.sanitizeKey(title);
          }
          continue;
        }

        // Handle key-value pairs (list items)
        if (line.startsWith('-') || line.startsWith('*')) {
          const kvMatch = line.match(/^[-*]\s*([^:]+):\s*(.*)$/);
          if (kvMatch) {
            const key = kvMatch[1].trim();
            const value = kvMatch[2].trim();

            if (!key) {
              throw new PluginError(
                `Empty key at line ${lineNumber}`,
                this.name,
                'parse'
              );
            }

            // Build full key path including sections
            const fullKey = [...sectionStack, key].join('.');
            this.setNestedValue(result, fullKey, value);
          }
        }
      }

      return result;
    } catch (error) {
      if (error instanceof PluginError) {
        throw error;
      }

      throw new PluginError(
        `Failed to parse Markdown: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        'parse',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate Markdown content from translation strings
   * @param strings Translation strings to convert to Markdown
   * @returns Formatted Markdown string
   */
  generate(strings: TranslationStrings): string {
    try {
      const lines: string[] = [];
      this.generateMarkdownRecursive(strings, lines, []);
      return lines.join('\n');
    } catch (error) {
      throw new PluginError(
        `Failed to generate Markdown: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        'generate',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate Markdown content structure and syntax
   * @param content Markdown content to validate
   * @returns Validation result with errors and warnings
   */
  validate(content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!content.trim()) {
      warnings.push({
        message: 'Empty Markdown content'
      });
      return { isValid: true, errors, warnings };
    }

    const lines = content.split('\n');
    let hasContent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;

      if (!line || line.startsWith('<!--')) {
        continue;
      }

      hasContent = true;

      // Validate headers
      if (line.startsWith('#')) {
        const headerMatch = line.match(/^(#+)\s*(.+)$/);
        if (!headerMatch) {
          errors.push({
            message: 'Invalid header format',
            line: lineNumber
          });
        } else if (headerMatch[1].length > 6) {
          warnings.push({
            message: 'Header level too deep (>6)',
            line: lineNumber
          });
        }
        continue;
      }

      // Validate list items
      if (line.startsWith('-') || line.startsWith('*')) {
        const kvMatch = line.match(/^[-*]\s*([^:]+):\s*(.*)$/);
        if (!kvMatch) {
          errors.push({
            message: 'Invalid key-value format. Expected "- key: value"',
            line: lineNumber
          });
        } else {
          const key = kvMatch[1].trim();
          const value = kvMatch[2].trim();

          if (!key) {
            errors.push({
              message: 'Empty key',
              line: lineNumber
            });
          }

          if (!value) {
            warnings.push({
              message: 'Empty value',
              line: lineNumber,
              key
            });
          }

          // Validate key format
          if (key.includes(' ') && !key.includes('.')) {
            warnings.push({
              message: 'Key contains spaces. Consider using dot notation for nested keys.',
              line: lineNumber,
              key
            });
          }
        }
        continue;
      }

      // Check for unrecognized content
      if (line && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*')) {
        warnings.push({
          message: 'Unrecognized content format',
          line: lineNumber
        });
      }
    }

    if (!hasContent) {
      warnings.push({
        message: 'No translation content found'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Set nested value in translation strings object
   * @param obj Target object
   * @param keyPath Dot-separated key path
   * @param value Value to set
   */
  private setNestedValue(obj: TranslationStrings, keyPath: string, value: string): void {
    const keys = keyPath.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      } else if (typeof current[key] === 'string') {
        // Convert string to object to allow nesting
        current[key] = {};
      }
      current = current[key] as TranslationStrings;
    }

    const finalKey = keys[keys.length - 1];
    current[finalKey] = value;
  }

  /**
   * Recursively generate Markdown content
   * @param strings Translation strings to process
   * @param lines Output lines array
   * @param path Current path for headers
   */
  private generateMarkdownRecursive(
    strings: TranslationStrings,
    lines: string[],
    path: string[]
  ): void {
    const entries = Object.entries(strings);
    
    // Sort entries to put objects last
    entries.sort(([, a], [, b]) => {
      const aIsString = typeof a === 'string';
      const bIsString = typeof b === 'string';
      
      if (aIsString && !bIsString) return -1;
      if (!aIsString && bIsString) return 1;
      return 0;
    });

    for (const [key, value] of entries) {
      if (typeof value === 'string') {
        // Generate key-value pair
        lines.push(`- ${key}: ${value}`);
      } else if (typeof value === 'object' && value !== null) {
        // Generate section header and recurse
        const headerLevel = Math.min(path.length + 1, 6);
        const headerPrefix = '#'.repeat(headerLevel);
        const sectionTitle = this.formatSectionTitle(key);
        
        lines.push('');
        lines.push(`${headerPrefix} ${sectionTitle}`);
        lines.push('');
        
        this.generateMarkdownRecursive(value, lines, [...path, key]);
      }
    }
  }

  /**
   * Sanitize key for use in section paths
   * @param key Raw key string
   * @returns Sanitized key
   */
  private sanitizeKey(key: string): string {
    return key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  /**
   * Format section title for display
   * @param key Section key
   * @returns Formatted title
   */
  private formatSectionTitle(key: string): string {
    return key
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
}

/**
 * Default Markdown plugin instance
 */
export const markdownPlugin = new MarkdownPlugin();