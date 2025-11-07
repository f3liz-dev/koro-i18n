#import "@preview/fletcher:0.5.1" as fletcher: diagram, node, edge

= I18n Platform System Architecture

== Overview

This document provides a mathematical and precise description of the I18n Platform system architecture, maintained in Typst format for version control and automated diagram generation.

== System Components

The I18n Platform consists of the following primary components:

- *Web Client*: Solid.js-based reactive user interface
- *API Gateway*: Hono framework routing and middleware layer
- *Authentication Service*: GitHub OAuth integration
- *Translation Service*: Core translation management with plugin support
- *GitHub Integration Service*: Automated commit and PR creation
- *Plugin System*: Extensible format handler architecture

== High-Level Architecture Diagram

#diagram(
  node-stroke: 1pt,
  edge-stroke: 1pt,
  node((0, 0), [Web Client], name: <client>),
  node((0, 1), [API Gateway], name: <gateway>),
  node((-1, 2), [Auth Service], name: <auth>),
  node((0, 2), [Translation Service], name: <translation>),
  node((1, 2), [GitHub Service], name: <github>),
  node((-1, 3), [GitHub OAuth], name: <oauth>),
  node((0, 3), [Plugin System], name: <plugins>),
  node((1, 3), [GitHub API], name: <ghapi>),
  
  edge(<client>, <gateway>, "->", [HTTPS]),
  edge(<gateway>, <auth>, "->", [Authenticate]),
  edge(<gateway>, <translation>, "->", [Translate]),
  edge(<gateway>, <github>, "->", [Commit]),
  edge(<auth>, <oauth>, "->", [OAuth Flow]),
  edge(<translation>, <plugins>, "->", [Parse/Generate]),
  edge(<github>, <ghapi>, "->", [API Calls]),
)

== Deployment Architecture

The platform supports two deployment models:

=== Serverless Deployment (Cloudflare Workers)

#diagram(
  node-stroke: 1pt,
  edge-stroke: 1pt,
  node((0, 0), [Client], name: <client>),
  node((0, 1), [Cloudflare Edge], name: <edge>),
  node((0, 2), [Hono Worker], name: <worker>),
  node((-1, 3), [KV Storage], name: <kv>),
  node((1, 3), [GitHub API], name: <gh>),
  
  edge(<client>, <edge>, "->", [Request]),
  edge(<edge>, <worker>, "->", [Route]),
  edge(<worker>, <kv>, "<->", [Session]),
  edge(<worker>, <gh>, "<->", [Commits]),
)

=== Traditional Server Deployment (Node.js)

#diagram(
  node-stroke: 1pt,
  edge-stroke: 1pt,
  node((0, 0), [Client], name: <client>),
  node((0, 1), [Load Balancer], name: <lb>),
  node((0, 2), [Hono Server], name: <server>),
  node((-1, 3), [Redis Cache], name: <redis>),
  node((1, 3), [GitHub API], name: <gh>),
  
  edge(<client>, <lb>, "->", [HTTPS]),
  edge(<lb>, <server>, "->", [Route]),
  edge(<server>, <redis>, "<->", [Session]),
  edge(<server>, <gh>, "<->", [Commits]),
)

== Authentication Flow

The authentication flow follows OAuth 2.0 protocol:

$ "User" arrow.r "Platform" : "Request Login" $
$ "Platform" arrow.r "GitHub" : "OAuth Initiate" $
$ "GitHub" arrow.r "User" : "Authorization Page" $
$ "User" arrow.r "GitHub" : "Grant Permission" $
$ "GitHub" arrow.r "Platform" : "Authorization Code" $
$ "Platform" arrow.r "GitHub" : "Exchange for Token" $
$ "GitHub" arrow.r "Platform" : "Access Token" $
$ "Platform" arrow.r "User" : "Session Created" $

== Translation Submission Flow

The translation submission process ensures proper validation and attribution:

$ "Contributor" arrow.r "UI" : "Submit Translation" $
$ "UI" arrow.r "Translation Service" : "Validate Format" $
$ "Translation Service" arrow.r "Plugin System" : "Parse & Validate" $
$ "Plugin System" arrow.r "Translation Service" : "Validation Result" $
$ "Translation Service" arrow.r "GitHub Service" : "Create Commit" $
$ "GitHub Service" arrow.r "GitHub API" : "Commit with Co-author" $
$ "GitHub API" arrow.r "GitHub Service" : "Commit SHA" $
$ "GitHub Service" arrow.r "UI" : "Success Response" $
$ "UI" arrow.r "Contributor" : "Confirmation" $

== Plugin Architecture

The plugin system provides extensibility for format handling:

#diagram(
  node-stroke: 1pt,
  edge-stroke: 1pt,
  node((0, 0), [Translation Service], name: <service>),
  node((0, 1), [Plugin Registry], name: <registry>),
  node((-1, 2), [JSON Plugin], name: <json>),
  node((0, 2), [Markdown Plugin], name: <md>),
  node((1, 2), [Custom Plugin], name: <custom>),
  
  edge(<service>, <registry>, "->", [Request Parser]),
  edge(<registry>, <json>, "->", [Load]),
  edge(<registry>, <md>, "->", [Load]),
  edge(<registry>, <custom>, "->", [Load]),
  edge(<json>, <registry>, "->", [Parse/Generate]),
  edge(<md>, <registry>, "->", [Parse/Generate]),
  edge(<custom>, <registry>, "->", [Parse/Generate]),
)

== Performance Requirements

The system must meet the following performance constraints:

- *Response Time*: $t_"response" lt.eq 200 "ms"$ for UI interactions
- *Load Time*: $t_"load" lt.eq 2 "s"$ for initial page load
- *Commit Time*: $t_"commit" lt.eq 60 "s"$ for translation submission
- *Startup Time*: $t_"startup" lt.eq 30 "s"$ for system deployment
- *Memory Usage*: $M_"server" lt.eq 2 "GB"$ for traditional deployment
- *Concurrent Sessions*: $N_"sessions" gt.eq 100$ simultaneous users

== Data Flow

=== Translation Data Flow

The translation data flows through the system as follows:

+ Source file read from GitHub repository
+ Configuration parsed from TOML file
+ Plugin selected based on file format
+ Source strings extracted by plugin
+ Translation UI rendered with source strings
+ User submits translation
+ Plugin validates translation format
+ Translation committed to repository
+ Co-author attribution applied
+ Confirmation sent to user

=== Configuration Data Flow

Configuration management follows this pattern:

+ Repository owner creates `.i18n-platform.toml`
+ Platform reads configuration on project initialization
+ TOML parser validates syntax and required fields
+ Configuration cached for performance
+ Changes detected via GitHub webhooks
+ Cache invalidated on configuration updates
+ New configuration loaded and validated

== Security Model

The security model implements defense in depth:

- *Authentication Layer*: OAuth 2.0 with GitHub
- *Authorization Layer*: Repository access validation
- *Transport Layer*: TLS 1.3 encryption
- *Session Layer*: JWT tokens with 24-hour expiry
- *Data Layer*: Encrypted credential storage
- *API Layer*: Rate limiting and CSRF protection

== Scalability Considerations

The architecture supports horizontal scaling through:

- Stateless request handling
- External session storage (Redis/KV)
- CDN integration for static assets
- Edge computing via Cloudflare Workers
- Database connection pooling
- Caching strategies at multiple layers

== Error Handling Strategy

Error handling follows a structured approach:

$ E_"total" = E_"client" union E_"server" union E_"external" $

Where:
- $E_"client"$: Client-side validation and network errors
- $E_"server"$: Server-side processing and logic errors
- $E_"external"$: GitHub API and external service errors

Each error category has specific recovery mechanisms and user feedback patterns.

== Monitoring and Observability

The system implements comprehensive monitoring:

- Request tracing with OpenTelemetry
- Performance metrics collection
- Error rate tracking
- Resource utilization monitoring
- User session analytics
- GitHub API rate limit tracking

== Version Information

#table(
  columns: 2,
  [*Field*], [*Value*],
  [Document Version], [1.0.0],
  [Last Updated], [2025-11-08],
  [Platform Version], [1.0.0],
  [Typst Version], [0.11.0],
)
