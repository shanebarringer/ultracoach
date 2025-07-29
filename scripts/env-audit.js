#!/usr/bin/env node

/**
 * Environment Variable Audit Script for Better Auth Production Issues
 * 
 * This script validates all environment variables required for Better Auth
 * and identifies potential mismatches or issues that could cause the
 * "hex string expected, got undefined" error in production.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class EnvironmentAuditor {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.recommendations = [];
    this.environment = process.env.NODE_ENV || 'development';
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '✅',
      warning: '⚠️ ',
      error: '❌',
      success: '🎉'
    }[type] || 'ℹ️ ';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addError(message) {
    this.errors.push(message);
    this.log(message, 'error');
  }

  addWarning(message) {
    this.warnings.push(message);
    this.log(message, 'warning');
  }

  addRecommendation(message) {
    this.recommendations.push(message);
    this.log(message, 'info');
  }

  // Check if environment variable exists and meets requirements
  checkEnvVar(name, requirements = {}) {
    const value = process.env[name];
    const {
      required = false,
      minLength = 0,
      maxLength = Infinity,
      pattern = null,
      type = 'string',
      description = ''
    } = requirements;

    this.log(`Checking ${name}...`);

    if (!value) {
      if (required) {
        this.addError(`${name} is required but not set. ${description}`);
        return false;
      } else {
        this.addWarning(`${name} is not set (optional). ${description}`);
        return null;
      }
    }

    // Check length
    if (value.length < minLength) {
      this.addError(`${name} is too short (${value.length} chars, minimum ${minLength})`);
      return false;
    }

    if (value.length > maxLength) {
      this.addError(`${name} is too long (${value.length} chars, maximum ${maxLength})`);
      return false;
    }

    // Check pattern
    if (pattern && !pattern.test(value)) {
      this.addError(`${name} does not match required pattern`);
      return false;
    }

    // Type checking
    if (type === 'url') {
      try {
        new URL(value);
        this.log(`${name}: Valid URL ✅`);
      } catch {
        this.addError(`${name} is not a valid URL: ${value}`);
        return false;
      }
    }

    if (type === 'hex') {
      if (!/^[0-9a-fA-F]+$/.test(value)) {
        this.addError(`${name} is not a valid hex string`);
        return false;
      }
    }

    this.log(`${name}: ✅ Valid (${value.length} chars)`);
    return true;
  }

  // Validate Better Auth Secret
  validateBetterAuthSecret() {
    this.log('\n🔐 Validating Better Auth Secret...');
    
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) {
      this.addError('BETTER_AUTH_SECRET is missing - this will cause authentication failures');
      return false;
    }

    // Check if secret is strong enough
    if (secret.length < 32) {
      this.addError(`BETTER_AUTH_SECRET is too short (${secret.length} chars). Minimum 32 characters recommended.`);
    }

    // Check if it's the default/weak secret
    const weakSecrets = [
      'your-secret-key',
      'secret',
      'password',
      'better-auth-secret',
      'development-secret'
    ];

    if (weakSecrets.includes(secret)) {
      this.addError('BETTER_AUTH_SECRET is using a weak/default value');
    }

    // Check entropy
    const uniqueChars = new Set(secret).size;
    const entropy = uniqueChars / secret.length;
    
    if (entropy < 0.3) {
      this.addWarning('BETTER_AUTH_SECRET has low entropy - consider using a more random secret');
    }

    // Verify it can be used for crypto operations
    try {
      const testData = 'test-data-for-secret-validation';
      const cipher = crypto.createCipher('aes256', secret);
      const encrypted = cipher.update(testData, 'utf8', 'hex') + cipher.final('hex');
      
      const decipher = crypto.createDecipher('aes256', secret);
      const decrypted = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
      
      if (decrypted !== testData) {
        this.addError('BETTER_AUTH_SECRET failed crypto validation test');
        return false;
      }
      
      this.log('BETTER_AUTH_SECRET: ✅ Crypto validation passed');
    } catch (error) {
      this.addError(`BETTER_AUTH_SECRET failed crypto test: ${error.message}`);
      return false;
    }

    return true;
  }

  // Validate database connection
  validateDatabase() {
    this.log('\n🗄️  Validating Database Configuration...');
    
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      this.addError('DATABASE_URL is missing');
      return false;
    }

    try {
      const url = new URL(dbUrl);
      
      // Check if it's a Supabase URL
      if (url.hostname.includes('supabase')) {
        this.log('Database: ✅ Supabase connection detected');
        
        // Validate SSL requirements for Supabase
        if (this.environment === 'production' && !url.searchParams.get('ssl')) {
          this.addWarning('Supabase connection may require SSL in production');
        }
      }
      
      // Check for sensitive info in URL
      if (url.pathname.includes('localhost') && this.environment === 'production') {
        this.addError('DATABASE_URL contains localhost in production environment');
      }
      
      this.log(`Database host: ${url.hostname}`);
      this.log(`Database name: ${url.pathname.slice(1)}`);
      
    } catch (error) {
      this.addError(`DATABASE_URL is not a valid URL: ${error.message}`);
      return false;
    }

    return true;
  }

  // Validate Vercel-specific variables
  validateVercelConfig() {
    this.log('\n▲ Validating Vercel Configuration...');
    
    const vercelUrl = process.env.VERCEL_URL;
    const betterAuthUrl = process.env.BETTER_AUTH_URL;
    
    if (this.environment === 'production') {
      if (vercelUrl) {
        this.log(`VERCEL_URL: ${vercelUrl} ✅`);
        
        // Check for localhost in production
        if (vercelUrl.includes('localhost')) {
          this.addError('VERCEL_URL contains localhost in production');
        }
      } else {
        this.addWarning('VERCEL_URL not set - may be automatically set by Vercel');
      }
      
      if (betterAuthUrl) {
        try {
          const url = new URL(betterAuthUrl);
          if (url.protocol !== 'https:') {
            this.addError('BETTER_AUTH_URL must use HTTPS in production');
          }
          this.log(`BETTER_AUTH_URL: ${betterAuthUrl} ✅`);
        } catch (error) {
          this.addError(`BETTER_AUTH_URL is not a valid URL: ${error.message}`);
        }
      }
    }

    return true;
  }

  // Check for conflicting or duplicate variables
  checkForConflicts() {
    this.log('\n🔍 Checking for Conflicting Variables...');
    
    const authUrls = [
      process.env.BETTER_AUTH_URL,
      process.env.NEXTAUTH_URL,
      process.env.AUTH_URL
    ].filter(Boolean);
    
    if (authUrls.length > 1) {
      this.addWarning(`Multiple auth URL variables detected: ${authUrls.join(', ')}`);
      this.addRecommendation('Use only BETTER_AUTH_URL for Better Auth configuration');
    }

    const secrets = [
      process.env.BETTER_AUTH_SECRET,
      process.env.NEXTAUTH_SECRET,
      process.env.AUTH_SECRET
    ].filter(Boolean);
    
    if (secrets.length > 1) {
      this.addWarning('Multiple auth secret variables detected');
      this.addRecommendation('Use only BETTER_AUTH_SECRET for Better Auth configuration');
    }

    // Check for localhost references in production
    if (this.environment === 'production') {
      const envVars = Object.entries(process.env);
      for (const [key, value] of envVars) {
        if (value && value.includes('localhost') && key.includes('URL')) {
          this.addError(`${key} contains localhost in production: ${value}`);
        }
      }
    }
  }

  // Generate recommendations based on findings
  generateRecommendations() {
    this.log('\n💡 Generating Recommendations...');
    
    if (this.errors.length === 0) {
      this.addRecommendation('All critical environment variables are properly configured!');
    }
    
    if (this.environment === 'production') {
      this.addRecommendation('Consider using Vercel environment variable dashboard for secure secret management');
      this.addRecommendation('Enable environment variable encryption in Vercel for sensitive data');
    }
    
    this.addRecommendation('Consider using a .env.example file to document required variables');
    this.addRecommendation('Use different secrets for development and production environments');
  }

  // Main audit function
  async audit() {
    this.log(`🔍 Starting Environment Variable Audit for ${this.environment} environment...`);
    this.log('='.repeat(80));

    // Define all required/optional environment variables
    const envConfig = {
      BETTER_AUTH_SECRET: {
        required: true,
        minLength: 32,
        description: 'Used for encryption, signing, and hashing in Better Auth'
      },
      DATABASE_URL: {
        required: true,
        type: 'url',
        description: 'PostgreSQL connection string for Supabase'
      },
      VERCEL_URL: {
        required: false,
        description: 'Automatically set by Vercel for deployment URL'
      },
      BETTER_AUTH_URL: {
        required: false,
        type: 'url',
        description: 'Override URL for Better Auth base URL'
      },
      NODE_ENV: {
        required: true,
        description: 'Environment mode (development, production, test)'
      }
    };

    // Run all validations
    for (const [name, requirements] of Object.entries(envConfig)) {
      this.checkEnvVar(name, requirements);
    }

    this.validateBetterAuthSecret();
    this.validateDatabase();
    this.validateVercelConfig();
    this.checkForConflicts();
    this.generateRecommendations();

    // Summary
    this.log('\n📊 Audit Summary');
    this.log('='.repeat(80));
    this.log(`Environment: ${this.environment}`);
    this.log(`Errors: ${this.errors.length}`);
    this.log(`Warnings: ${this.warnings.length}`);
    this.log(`Recommendations: ${this.recommendations.length}`);

    if (this.errors.length > 0) {
      this.log('\n❌ Critical Issues Found:', 'error');
      this.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  Warnings:', 'warning');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }

    if (this.recommendations.length > 0) {
      this.log('\n💡 Recommendations:', 'info');
      this.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    const success = this.errors.length === 0;
    this.log(`\n${success ? '🎉' : '❌'} Audit ${success ? 'PASSED' : 'FAILED'}`, success ? 'success' : 'error');
    
    return {
      success,
      errors: this.errors,
      warnings: this.warnings,
      recommendations: this.recommendations,
      environment: this.environment
    };
  }
}

// Run audit if script is executed directly
if (require.main === module) {
  const auditor = new EnvironmentAuditor();
  auditor.audit().then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Audit failed with error:', error);
    process.exit(1);
  });
}

module.exports = EnvironmentAuditor;