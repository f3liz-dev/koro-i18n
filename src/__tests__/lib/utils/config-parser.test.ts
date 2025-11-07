/**
 * Tests for TOML configuration parser
 */
import { describe, it, expect } from 'vitest';
import { parseAndValidateConfig, generateSampleConfig, validateRequiredFields } from '@/lib/utils/config-parser.js';

describe('Config Parser', () => {
  it('should parse valid TOML configuration', () => {
    const validToml = `
sourceLanguage = "en"
targetLanguages = ["es", "fr"]
outputPattern = "locales/{lang}/messages.toml"

[[sourceFiles]]
path = "src/locales/en/common.toml"
format = "toml"

[settings]
submitAsPR = true
requireReview = true
autoMerge = false
prTitleTemplate = "feat(i18n): update translations"
commitMessageTemplate = "Update translations"
`;

    const result = parseAndValidateConfig(validToml);
    
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.sourceLanguage).toBe('en');
    expect(result.config?.targetLanguages).toEqual(['es', 'fr']);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject invalid TOML syntax', () => {
    const invalidToml = `
sourceLanguage = "en
targetLanguages = ["es", "fr"]
`;

    const result = parseAndValidateConfig(invalidToml);
    
    expect(result.success).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('toml');
  });

  it('should validate required fields', () => {
    const config = {
      sourceLanguage: '',
      targetLanguages: [],
      outputPattern: '',
      excludePatterns: undefined,
      includePatterns: undefined,
      sourceFiles: [],
      settings: {
        submitAsPR: true,
        requireReview: true,
        autoMerge: false,
        prTitleTemplate: '',
        commitMessageTemplate: ''
      }
    };

    const errors = validateRequiredFields(config);
    
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'sourceLanguage')).toBe(true);
    expect(errors.some(e => e.field === 'targetLanguages')).toBe(true);
    expect(errors.some(e => e.field === 'outputPattern')).toBe(true);
  });

  it('should generate valid sample configuration', () => {
    const sample = generateSampleConfig();
    
    expect(sample).toContain('sourceLanguage');
    expect(sample).toContain('targetLanguages');
    expect(sample).toContain('[[sourceFiles]]');
    expect(sample).toContain('[settings]');
  });
});