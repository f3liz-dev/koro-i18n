import * as core from "@actions/core";
import * as path from "path"

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
const actionRoot = path.resolve(__dirname, '../..');
const clientLibPath = path.join(actionRoot, 'client-library');

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
