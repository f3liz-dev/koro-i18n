-- Migration: Add redirectUrl field to OauthState table
-- This field stores the URL to redirect to after successful OAuth authentication

-- Add redirectUrl column (nullable)
ALTER TABLE "OauthState" ADD COLUMN redirectUrl TEXT;
