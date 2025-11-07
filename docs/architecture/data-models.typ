= Data Models and Type System

== Overview

This document provides mathematical definitions of the core data models used throughout the I18n Platform, ensuring type safety and consistency across the system.

== Type Notation

We use the following mathematical notation for type definitions:

- $A times B$: Product type (tuple)
- $A + B$: Sum type (union)
- $A arrow.r B$: Function type
- $[A]$: List type
- ${A}$: Set type
- $A?$: Optional type (equivalent to $A + "null"$)

== Core Domain Types

=== User Domain

The User domain represents authenticated users and their preferences:

$ "User" = { $
$  quad "id": "String", $
$  quad "githubId": "Integer", $
$  quad "username": "String", $
$  quad "email": "String", $
$  quad "avatarUrl": "String", $
$  quad "accessToken": "EncryptedString", $
$  quad "refreshToken": "EncryptedString", $
$  quad "lastActive": "DateTime", $
$  quad "preferences": "UserPreferences" $
$ } $

$ "UserPreferences" = { $
$  quad "language": "String", $
$  quad "theme": {"light", "dark", "auto"}, $
$  quad "autoSave": "Boolean", $
$  quad "notifications": "Boolean" $
$ } $

=== Project Domain

The Project domain encapsulates translation project configuration:

$ "Project" = { $
$  quad "id": "String", $
$  quad "name": "String", $
$  quad "repository": "Repository", $
$  quad "sourceLanguage": "String", $
$  quad "targetLanguages": ["String"], $
$  quad "translationFiles": ["TranslationFile"], $
$  quad "settings": "ProjectSettings", $
$  quad "config": "TranslationConfig" $
$ } $

$ "Repository" = { $
$  quad "owner": "String", $
$  quad "name": "String", $
$  quad "branch": "String" $
$ } $

$ "ProjectSettings" = { $
$  quad "submitAsPR": "Boolean", $
$  quad "requireReview": "Boolean", $
$  quad "autoMerge": "Boolean", $
$  quad "commitMessageTemplate": "String", $
$  quad "prTitleTemplate": "String", $
$  quad "plugins": "PluginConfig" $
$ } $

=== Translation Domain

The Translation domain manages translation strings and their lifecycle:

$ "Translation" = { $
$  quad "id": "String", $
$  quad "projectId": "String", $
$  quad "stringKey": "String", $
$  quad "sourceText": "String", $
$  quad "translatedText": "String", $
$  quad "language": "String", $
$  quad "status": "TranslationStatus", $
$  quad "contributor": "Contributor", $
$  quad "metadata": "TranslationMetadata" $
$ } $

$ "TranslationStatus" = {"draft", "submitted", "committed", "failed"} $

$ "Contributor" = { $
$  quad "userId": "String", $
$  quad "username": "String" $
$ } $

$ "TranslationMetadata" = { $
$  quad "createdAt": "DateTime", $
$  quad "updatedAt": "DateTime", $
$  quad "commitSha": "String"?, $
$  quad "reviewStatus": "ReviewStatus"? $
$ } $

$ "ReviewStatus" = {"pending", "approved", "rejected"} $

=== Configuration Domain

The Configuration domain defines project setup and file handling:

$ "TranslationConfig" = { $
$  quad "sourceFiles": ["SourceFileConfig"], $
$  quad "outputPattern": "String", $
$  quad "excludePatterns": ["String"], $
$  quad "includePatterns": ["String"] $
$ } $

$ "SourceFileConfig" = { $
$  quad "path": "String", $
$  quad "format": "FileFormat", $
$  quad "keyPattern": "String"?, $
$  quad "outputPath": "String"?, $
$  quad "plugin": "String"? $
$ } $

$ "FileFormat" = {"json", "markdown"} union "CustomFormat" $

=== Plugin Domain

The Plugin domain provides extensibility for format handling:

$ "FormatPlugin" = { $
$  quad "name": "String", $
$  quad "version": "String", $
$  quad "supportedFormats": ["String"], $
$  quad "parse": "String" arrow.r "TranslationStrings", $
$  quad "generate": "TranslationStrings" arrow.r "String", $
$  quad "validate": "String" arrow.r "ValidationResult" $
$ } $

$ "TranslationStrings" = "String" arrow.r ("String" + "TranslationStrings") $

$ "ValidationResult" = { $
$  quad "isValid": "Boolean", $
$  quad "errors": ["ValidationError"], $
$  quad "warnings": ["ValidationWarning"] $
$ } $

$ "ValidationError" = { $
$  quad "message": "String", $
$  quad "line": "Integer"?, $
$  quad "column": "Integer"?, $
$  quad "key": "String"? $
$ } $

== Type Invariants

The following invariants must hold for all instances:

=== User Invariants

$ forall u in "User": $
$ quad u."githubId" > 0 $
$ quad |u."username"| > 0 $
$ quad u."lastActive" lt.eq "now"() $

=== Project Invariants

$ forall p in "Project": $
$ quad |p."targetLanguages"| > 0 $
$ quad p."sourceLanguage" in.not p."targetLanguages" $
$ quad forall f in p."translationFiles": f."language" in p."targetLanguages" $

=== Translation Invariants

$ forall t in "Translation": $
$ quad |t."stringKey"| > 0 $
$ quad |t."sourceText"| > 0 $
$ quad (t."status" = "committed") arrow.r.double (t."metadata"."commitSha" eq.not "null") $

=== Plugin Invariants

$ forall p in "FormatPlugin": $
$ quad |p."supportedFormats"| > 0 $
$ quad forall f in p."supportedFormats": p."parse" compose p."generate" tilde.equiv "id" $

== State Transitions

=== Translation Status State Machine

The translation status follows this state machine:

$ "draft" arrow.r "submitted" arrow.r "committed" $
$ "submitted" arrow.r "failed" arrow.r "draft" $

Formally:

$ delta: "TranslationStatus" times "Event" arrow.r "TranslationStatus" $

Where:
$ delta("draft", "submit") = "submitted" $
$ delta("submitted", "commit_success") = "committed" $
$ delta("submitted", "commit_failure") = "failed" $
$ delta("failed", "retry") = "draft" $

=== Session State Machine

User sessions transition through these states:

$ "unauthenticated" arrow.r "authenticating" arrow.r "authenticated" arrow.r "expired" $

$ sigma: "SessionState" times "Event" arrow.r "SessionState" $

Where:
$ sigma("unauthenticated", "login") = "authenticating" $
$ sigma("authenticating", "oauth_success") = "authenticated" $
$ sigma("authenticated", "timeout") = "expired" $
$ sigma("authenticated", "logout") = "unauthenticated" $

== Validation Rules

=== Format Validation

For JSON format:

$ "valid"_"JSON"(s) arrow.r.double exists t: "parse"_"JSON"(s) = t and "generate"_"JSON"(t) tilde.equiv s $

For Markdown format:

$ "valid"_"MD"(s) arrow.r.double exists t: "parse"_"MD"(s) = t and "generate"_"MD"(t) tilde.equiv s $

=== Configuration Validation

A configuration is valid if:

$ "valid"_"config"(c) arrow.r.double $
$ quad (|c."sourceFiles"| > 0) and $
$ quad (forall f in c."sourceFiles": "exists"(f."path")) and $
$ quad (|c."targetLanguages"| > 0) and $
$ quad ("valid"_"pattern"(c."outputPattern")) $

== Performance Constraints

The following performance constraints are expressed mathematically:

=== Time Complexity

- Translation lookup: $O(1)$ with hash-based indexing
- Plugin selection: $O(n)$ where $n$ is number of registered plugins
- Configuration parsing: $O(m)$ where $m$ is configuration file size
- Validation: $O(k)$ where $k$ is number of translation strings

=== Space Complexity

- User session storage: $O(u)$ where $u$ is number of active users
- Translation cache: $O(t)$ where $t$ is number of translations
- Plugin registry: $O(p)$ where $p$ is number of plugins
- Configuration cache: $O(c)$ where $c$ is number of projects

=== Resource Bounds

$ M_"total" lt.eq 2 "GB" $
$ N_"concurrent" gt.eq 100 $
$ t_"response" lt.eq 200 "ms" $
$ t_"commit" lt.eq 60 "s" $

== Algebraic Properties

=== Plugin Composition

Plugins form a category where:

$ "id"_"plugin": "String" arrow.r "String" $
$ (p_1 compose p_2)."parse" = p_1."parse" compose p_2."parse" $
$ (p_1 compose p_2)."generate" = p_2."generate" compose p_1."generate" $

=== Translation Monoid

Translations form a monoid under concatenation:

$ (T, plus.circle, epsilon) $

Where:
- $T$ is the set of all translations
- $plus.circle$ is the concatenation operation
- $epsilon$ is the empty translation

Properties:
$ forall t_1, t_2, t_3 in T: $
$ quad (t_1 plus.circle t_2) plus.circle t_3 = t_1 plus.circle (t_2 plus.circle t_3) $ (Associativity)
$ quad t plus.circle epsilon = epsilon plus.circle t = t $ (Identity)

== Version Information

#table(
  columns: 2,
  [*Field*], [*Value*],
  [Document Version], [1.0.0],
  [Last Updated], [2025-11-08],
  [Platform Version], [1.0.0],
)
