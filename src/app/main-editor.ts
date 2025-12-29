import './styles/minimal.css';
import { createApp } from 'vue';
import Editor from './components/Editor.vue';

function renderEditor() {
  const main = document.getElementById('main');
  if (!main) return;

  const params = new URLSearchParams(window.location.search);
  const project = params.get('project');
  const filename = params.get('filename');
  const language = params.get('language');

  if (!project || !language || !filename) {
    main.innerHTML = '<div class="message info">Missing required parameters: project, language, or filename</div>';
    return;
  }

  main.innerHTML = '<div id="vue-app"></div>';
  const app = createApp(Editor, {
    project,
    language,
    filename,
  });

  app.mount('#vue-app');
}

void renderEditor();
