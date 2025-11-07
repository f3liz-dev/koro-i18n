import { Component } from 'solid-js';
import { useParams } from '@solidjs/router';
import TranslationEditor from '../components/translation/TranslationEditor';
import AuthGuard from '../components/auth/AuthGuard';

const TranslationEditorPage: Component = () => {
  const params = useParams();
  
  return (
    <AuthGuard>
      <div class="translation-editor-page">
        <TranslationEditor 
          projectId={params.projectId}
          language={params.language}
        />
      </div>
    </AuthGuard>
  );
};

export default TranslationEditorPage;