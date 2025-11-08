/// <reference types="@cloudflare/workers-types" />
import { Octokit } from '@octokit/rest';

interface Env {
  DB: D1Database;
  GITHUB_BOT_TOKEN: string;
}

interface Translation {
  id: string;
  projectId: string;
  language: string;
  key: string;
  value: string;
  userId: string;
  username: string;
  createdAt: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Starting translation batch commit cron job');

    try {
      // Get approved translations grouped by project and language
      const pendingTranslations = await env.DB.prepare(
        `SELECT * FROM translations 
         WHERE status = 'approved' 
         ORDER BY projectId, language, createdAt`
      ).all();

      if (!pendingTranslations.results || pendingTranslations.results.length === 0) {
        console.log('No pending translations to commit');
        return;
      }

      // Group translations by project and language
      const grouped = new Map<string, Translation[]>();
      for (const translation of pendingTranslations.results as Translation[]) {
        const key = `${translation.projectId}:${translation.language}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(translation);
      }

      const octokit = new Octokit({ auth: env.GITHUB_BOT_TOKEN });

      // Process each group
      for (const [groupKey, translations] of grouped.entries()) {
        const [projectId, language] = groupKey.split(':');
        
        try {
          // Parse projectId as owner/repo
          const [owner, repo] = projectId.split('/');
          if (!owner || !repo) {
            console.error(`Invalid projectId format: ${projectId}`);
            continue;
          }

          // Get the default branch
          const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
          const defaultBranch = repoData.default_branch;

          // Get the latest commit SHA
          const { data: refData } = await octokit.rest.git.getRef({
            owner,
            repo,
            ref: `heads/${defaultBranch}`,
          });
          const latestCommitSha = refData.object.sha;

          // Read the translation file (assuming JSON format in locales/{language}.json)
          const filePath = `locales/${language}.json`;
          let fileContent: any = {};
          let fileSha: string | undefined;

          try {
            const { data: fileData } = await octokit.rest.repos.getContent({
              owner,
              repo,
              path: filePath,
              ref: defaultBranch,
            });

            if ('content' in fileData) {
              fileContent = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
              fileSha = fileData.sha;
            }
          } catch (error: any) {
            if (error.status !== 404) throw error;
            // File doesn't exist, will create new
          }

          // Update translations
          for (const translation of translations) {
            const keys = translation.key.split('.');
            let current = fileContent;
            for (let i = 0; i < keys.length - 1; i++) {
              if (!current[keys[i]]) current[keys[i]] = {};
              current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = translation.value;
          }

          // Create commit message with co-authors
          const contributors = [...new Set(translations.map(t => t.username))];
          const commitMessage = `feat(i18n): Update ${language} translations

Added/updated ${translations.length} translation(s)

${contributors.map(username => `Co-authored-by: ${username} <${username}@users.noreply.github.com>`).join('\n')}`;

          // Commit the file
          const { data: commitData } = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: filePath,
            message: commitMessage,
            content: Buffer.from(JSON.stringify(fileContent, null, 2)).toString('base64'),
            branch: defaultBranch,
            sha: fileSha,
          });

          // Update translation status and log commit
          const translationIds = translations.map(t => t.id);
          for (const translation of translations) {
            await env.DB.prepare(
              'UPDATE translations SET status = ?, commitSha = ?, updatedAt = datetime("now") WHERE id = ?'
            ).bind('committed', commitData.commit.sha, translation.id).run();

            // Log commit to history
            const historyId = crypto.randomUUID();
            await env.DB.prepare(
              'INSERT INTO translation_history (id, translationId, projectId, language, key, value, userId, username, action, commitSha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(historyId, translation.id, translation.projectId, translation.language, translation.key, translation.value, translation.userId, translation.username, 'committed', commitData.commit.sha).run();
          }

          console.log(`Committed ${translations.length} translations for ${projectId}/${language}`);
        } catch (error) {
          console.error(`Failed to commit translations for ${groupKey}:`, error);
          
          // Mark translations as rejected and log
          for (const translation of translations) {
            await env.DB.prepare(
              'UPDATE translations SET status = ?, updatedAt = datetime("now") WHERE id = ?'
            ).bind('rejected', translation.id).run();

            // Log rejection to history
            const historyId = crypto.randomUUID();
            await env.DB.prepare(
              'INSERT INTO translation_history (id, translationId, projectId, language, key, value, userId, username, action, commitSha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(historyId, translation.id, translation.projectId, translation.language, translation.key, translation.value, translation.userId, translation.username, 'rejected', null).run();
          }
        }
      }

      console.log('Translation batch commit completed');
    } catch (error) {
      console.error('Cron job failed:', error);
    }
  },
};
