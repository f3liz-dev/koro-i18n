import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  // Get inputs
  const platformUrl = core.getInput('platform-url');
  const projectName = core.getInput('project-name');
  const configPath = core.getInput('config-path');

  core.info(`Platform URL: ${platformUrl}`);
  core.info(`Project: ${projectName}`);
  core.info(`Config: ${configPath}`);

  // Get OIDC token with platform URL as audience
  core.info('Requesting OIDC token...');
  const token = await core.getIDToken(platformUrl);

  if (!token) {
    throw new Error('Failed to obtain OIDC token');
  }

  core.info('✓ OIDC token obtained successfully');

  // Build the client library
  core.info('Building koro-i18n client library...');
  // From dist/index.js -> src -> upload-translations -> actions -> .github -> repo root
  const repoRoot = path.resolve(__dirname, '../../../../..');
  const clientLibPath = path.join(repoRoot, 'client-library');

  await exec.exec('npm', ['install'], { cwd: clientLibPath });
  await exec.exec('npm', ['run', 'build'], { cwd: clientLibPath });

  core.info('✓ Client library built successfully');

  // Run the upload
  core.info('Uploading translations...');
  const cliPath = path.join(clientLibPath, 'dist', 'cli.js');

  await exec.exec('node', [cliPath, configPath], {
    env: {
      ...process.env,
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: token,
      I18N_PLATFORM_URL: platformUrl,
    },
  });

  core.info('✓ Upload completed successfully');
} catch (error) {
  core.setFailed(error.message);
}
