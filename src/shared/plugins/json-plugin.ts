/**
 * JSON format plugin for parsing and generating JSON translation files
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
 * JSON format plugin implementation
 */
export class JsonPlugin implements FormatPlugin {
  readonly name = 'json-plugin';
  readonly version = '1.0.0';
  readonly supportedFormats = ['json'];

  /**
   * Parse JSON content into translation strings
   * @param content JSON content to parse
   * @returns Parsed translation strings with nested structure
   */
  parse(content: string): TranslationStrings {
    try {
      if (!content.trim()) {
        return {};
      }

      const parsed = JSON.parse(content);
      
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new PluginError(
          'JSON content must be an object',
          this.name,
          'parse'
        );
      }

      return this.normalizeTranslationStrings(parsed);
    } catch (error) {
      if (error instanceof PluginError) {
        throw error;
      }
      
      if (error instanceof SyntaxError) {
        throw new PluginError(
          `Invalid JSON syntax: ${error.message}`,
          this.name,
          'parse',
          error
        );
      }

      throw new PluginError(
        `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        'parse',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Generate JSON content from translation strings
   * @param strings Translation strings to convert to JSON
   * @returns Formatted JSON string
   */
  generate(strings: TranslationStrings): string {
    try {
      // Convert to plain object for JSON serialization
      const plainObject = this.convertToPlainObject(strings);
      
      // Generate formatted JSON with 2-space indentation
      return JSON.stringify(plainObject, null, 2);
    } catch (error) {
      throw new PluginError(
        `Failed to generate JSON: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        'generate',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Validate JSON content structure and syntax
   * @param content JSON content to validate
   * @returns Validation result with errors and warnings
   */
  validate(content: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for empty content
    if (!content.trim()) {
      warnings.push({
        message: 'Empty JSON content'
      });
      return { isValid: true, errors, warnings };
    }

    try {
      const parsed = JSON.parse(content);

      // Validate root structure
      if (typeof parsed !== 'object' || parsed === null) {
        errors.push({
          message: 'JSON root must be an object'
        });
      } else if (Array.isArray(parsed)) {
        errors.push({
          message: 'JSON root cannot be an array'
        });
      } else {
        // Validate nested structure
        this.validateNestedStructure(parsed, '', errors, warnings);
      }

      // Check for potential formatting issues
      const reformatted = JSON.stringify(parsed, null, 2);
      if (content !== reformatted) {
        warnings.push({
          message: 'JSON formatting could be improved'
        });
      }

    } catch (error) {
      if (error instanceof SyntaxError) {
        // Try to extract line/column information from syntax error
        const match = error.message.match(/at position (\d+)/);
        const position = match ? parseInt(match[1], 10) : undefined;
        
        let line: number | undefined;
        let column: number | undefined;
        
        if (position !== undefined) {
          const lines = content.substring(0, position).split('\n');
          line = lines.length;
          column = lines[lines.length - 1].length + 1;
        }

        errors.push({
          message: `JSON syntax error: ${error.message}`,
          line,
          column
        });
      } else {
        errors.push({
          message: `JSON validation error: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Normalize parsed JSON into TranslationStrings format
   * @param obj Parsed JSON object
   * @returns Normalized translation strings
   */
  private normalizeTranslationStrings(obj: any): TranslationStrings {
    const result: TranslationStrings = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.normalizeTranslationStrings(value);
      } else {
        // Skip non-string, non-object values with warning
        // This will be caught in validation
        continue;
      }
    }

    return result;
  }

  /**
   * Convert TranslationStrings to plain object for JSON serialization
   * @param strings Translation strings to convert
   * @returns Plain object
   */
  private convertToPlainObject(strings: TranslationStrings): any {
    const result: any = {};

    for (const [key, value] of Object.entries(strings)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.convertToPlainObject(value);
      }
    }

    return result;
  }

  /**
   * Validate nested structure of parsed JSON
   * @param obj Object to validate
   * @param path Current path for error reporting
   * @param errors Array to collect errors
   * @param warnings Array to collect warnings
   */
  private validateNestedStructure(
    obj: any,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        // Valid translation string
        if (value.length === 0) {
          warnings.push({
            message: `Empty translation string at ${currentPath}`,
            key: currentPath
          });
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Nested object - recurse
        this.validateNestedStructure(value, currentPath, errors, warnings);
      } else {
        // Invalid value type
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        errors.push({
          message: `Invalid value type '${valueType}' at ${currentPath}. Expected string or object.`,
          key: currentPath
        });
      }
    }
  }
}

/**
 * Default JSON plugin instance
 */
export const jsonPlugin = new JsonPlugin();