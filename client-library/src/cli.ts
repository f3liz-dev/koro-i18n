#!/usr/bin/env node

import { main } from './index';

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
