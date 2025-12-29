<template>
  <div>
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold">{{ title }}</h1>
        <p class="text-sm text-secondary">{{ subtitle }}</p>
      </div>
      <div class="flex gap-2">
        <a :href="backLink" class="btn ghost nav-link">Back to Project</a>
      </div>
    </div>
    <div class="mb-6">
      <input
        type="text"
        class="input"
        v-model="searchQuery"
        placeholder="Search keys or translations..."
      />
    </div>
    <div v-if="loading" class="flex justify-center p-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
    <div v-else-if="error" class="message error">{{ error }}</div>
    <div v-else-if="filteredKeys.length === 0" class="message info">
      No translation keys found.
    </div>
    <div v-else class="flex gap-4">
      <!-- Sidebar -->
      <div v-show="!focusMode" class="card p-4" style="width: 34%">
        <div style="max-height: 60vh; overflow: auto">
          <button
            v-for="(key, idx) in filteredKeys"
            :key="key"
            @click="currentIndex = idx"
            :class="['btn ghost w-full text-left mb-2', { selected: idx === currentIndex }]"
          >
            {{ key }}
          </button>
        </div>
      </div>

      <!-- Main panel -->
      <div class="card p-4" style="flex: 1">
        <div class="mb-4 text-sm text-secondary">
          Translating key {{ currentIndex + 1 }} of {{ filteredKeys.length }}
        </div>
        <div class="mb-2">
          <h2 class="font-bold">{{ currentKey }}</h2>
        </div>
        <div class="mb-4 text-sm text-secondary">
          {{ sourceValue }}
        </div>
        <div class="label">Current text</div>
        <div class="mb-4">{{ targetValue }}</div>

        <div class="label">Your translation</div>
        <textarea
          ref="textareaRef"
          class="input"
          style="width: 100%"
          v-model="translationValue"
          placeholder="Enter your translation..."
          @keydown="handleKeydown"
        ></textarea>

        <div class="flex gap-2 mt-4">
          <button
            @click="submitTranslation"
            :disabled="submitting"
            class="btn primary"
          >
            {{ submitting ? 'Submitting...' : 'Submit (Ctrl+Enter)' }}
          </button>
          <button @click="navigate(1)" class="btn ghost">Skip</button>
          <button @click="navigate(-1)" class="btn ghost">Prev (k)</button>
          <button @click="navigate(1)" class="btn ghost">Next (j)</button>
          <button @click="toggleFocusMode" class="btn ghost">
            {{ focusMode ? 'Exit focus' : 'Focus mode' }}
          </button>
        </div>

        <!-- Feedback message -->
        <div v-if="feedbackMessage" class="mt-2">
          <div :class="['message', feedbackType]">{{ feedbackMessage }}</div>
        </div>

        <!-- Suggestion panel positioned AFTER submit button (Crowdin-style) -->
        <div class="card p-4 mt-4 bg-secondary-bg">
          <div class="label mb-2">History</div>
          <div v-if="allSuggestions.length === 0" class="text-sm text-secondary">
            No history available
          </div>
          <div v-else>
            <!-- Virtual suggestions (from GitHub repository) -->
            <div
              v-for="(suggestion, idx) in virtualSuggestions"
              :key="'virtual-' + idx"
              class="flex items-center gap-2 mt-2 p-2 border border-success rounded"
            >
              <span class="badge success">Git</span>
              <div class="flex-1">{{ suggestion.value }}</div>
              <button
                @click="useSuggestion(suggestion.value)"
                class="btn success small"
              >
                Use
              </button>
            </div>

            <!-- Approved D1 suggestions -->
            <div
              v-for="(suggestion, idx) in approvedSuggestions"
              :key="'approved-' + idx"
              class="flex items-center gap-2 mt-2 p-2 border border-info rounded"
            >
              <span class="badge info">Approved</span>
              <div class="flex-1">
                {{ suggestion.value }} (by {{ suggestion.username || 'unknown' }})
              </div>
              <button
                @click="useSuggestion(suggestion.value)"
                class="btn info small"
              >
                Use
              </button>
            </div>

            <!-- Pending D1 suggestions -->
            <div
              v-for="(suggestion, idx) in pendingSuggestions"
              :key="'pending-' + idx"
              class="flex items-center gap-2 mt-2 p-2 border border-secondary rounded"
            >
              <span class="badge">Pending</span>
              <div class="flex-1">
                {{ suggestion.value }} (by {{ suggestion.username || 'unknown' }})
              </div>
              <button
                @click="useSuggestion(suggestion.value)"
                class="btn ghost small"
              >
                Use
              </button>
            </div>
          </div>
        </div>

        <!-- Moderation actions -->
        <div
          v-if="pendingSuggestions.length > 0"
          class="mt-4 card p-4 bg-warning-bg"
        >
          <div class="label mb-2">Moderate suggestions</div>
          <div
            v-for="(suggestion, idx) in pendingSuggestions"
            :key="'moderate-' + idx"
            class="flex items-center gap-2 mt-2"
          >
            <div class="flex-1">
              {{ suggestion.value }} (by {{ suggestion.username || 'unknown' }})
            </div>
            <button
              @click="approveSuggestion(suggestion.id, 'approved')"
              class="btn success small"
            >
              Approve
            </button>
            <button
              @click="approveSuggestion(suggestion.id, 'rejected')"
              class="btn ghost small"
            >
              Reject
            </button>
            <button
              @click="deleteSuggestion(suggestion.id)"
              class="btn danger small"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { signal, computed as alienComputed, effect } from 'alien-signals';
import {
  fetchTranslationFile,
  submitTranslation as apiSubmitTranslation,
  approveTranslation,
  deleteTranslation,
} from '../api';
import type { TranslationFileData } from '../api';

// Props
const props = defineProps<{
  project: string;
  language: string;
  filename: string;
}>();

// Signals for reactive state management
const dataSignal = signal<TranslationFileData | null>(null);
const loadingSignal = signal(true);
const errorSignal = signal<string | null>(null);
const searchQuerySignal = signal('');
const currentIndexSignal = signal(0);
const translationValueSignal = signal('');
const submittingSignal = signal(false);
const feedbackMessageSignal = signal('');
const feedbackTypeSignal = signal<'success' | 'error'>('success');
const focusModeSignal = signal(false);

// Vue refs
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');
const currentIndex = ref(0);
const translationValue = ref('');
const submitting = ref(false);
const feedbackMessage = ref('');
const feedbackType = ref<'success' | 'error'>('success');
const focusMode = ref(false);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// Computed values
const title = computed(() => 'Editor');
const subtitle = computed(() => `Project: ${props.project}`);
const backLink = computed(
  () => `/project.html?name=${encodeURIComponent(props.project)}`
);

const data = computed(() => dataSignal.value);

const allKeys = computed(() => {
  if (!data.value) return [];
  return Object.keys(data.value.source).sort();
});

const filteredKeys = computed(() => {
  const query = searchQuery.value.trim();
  if (!query) return allKeys.value;
  return allKeys.value.filter((k) => k.includes(query));
});

const currentKey = computed(() => {
  if (filteredKeys.value.length === 0) return '';
  return filteredKeys.value[currentIndex.value];
});

const sourceValue = computed(() => {
  if (!data.value || !currentKey.value) return '';
  return data.value.source[currentKey.value] ?? '';
});

const targetValue = computed(() => {
  if (!data.value || !currentKey.value) return '';
  return data.value.target[currentKey.value] ?? '';
});

const pendingSuggestions = computed(() => {
  if (!data.value || !currentKey.value) return [];
  const pending = data.value.pending || [];
  return pending.filter((p) => p.key === currentKey.value);
});

const approvedSuggestions = computed(() => {
  if (!data.value || !currentKey.value) return [];
  const approved = data.value.approved || [];
  return approved.filter((a) => a.key === currentKey.value);
});

const virtualSuggestions = computed(() => {
  if (!data.value || !currentKey.value) return [];
  const virtual = data.value.virtualSuggestions || [];
  return virtual.filter((v) => v.key === currentKey.value);
});

const allSuggestions = computed(() => {
  return [
    ...virtualSuggestions.value,
    ...approvedSuggestions.value,
    ...pendingSuggestions.value,
  ];
});

// Watchers
watch(currentKey, () => {
  updateTranslationValue();
  focusTextarea();
});

watch(searchQuery, () => {
  currentIndex.value = 0;
});

// Methods
function updateTranslationValue() {
  // Priority: pending (most recent user input) > approved > virtual (git) > target (git file)
  const pendingValue = pendingSuggestions.value[0]?.value ?? '';
  const approvedValue = approvedSuggestions.value[0]?.value ?? '';
  const virtualValue = virtualSuggestions.value[0]?.value ?? '';
  const gitValue = targetValue.value;

  if (pendingValue) {
    translationValue.value = pendingValue;
  } else if (approvedValue) {
    translationValue.value = approvedValue;
  } else if (virtualValue) {
    translationValue.value = virtualValue;
  } else {
    translationValue.value = gitValue;
  }
}

function navigate(offset: number) {
  if (filteredKeys.value.length === 0) return;
  currentIndex.value = Math.max(
    0,
    Math.min(filteredKeys.value.length - 1, currentIndex.value + offset)
  );
}

function useSuggestion(value: string) {
  translationValue.value = value;
  focusTextarea();
}

function toggleFocusMode() {
  focusMode.value = !focusMode.value;
}

function focusTextarea() {
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      const len = textareaRef.value.value.length;
      textareaRef.value.selectionStart = textareaRef.value.selectionEnd = len;
    }
  });
}

function handleKeydown(e: KeyboardEvent) {
  const key = (e.key || '').toLowerCase();

  // Ctrl/Cmd+Enter to submit
  if ((e.ctrlKey || e.metaKey) && key === 'enter') {
    e.preventDefault();
    submitTranslation();
    return;
  }

  // Don't intercept navigation keys while typing
  const active = document.activeElement as HTMLElement | null;
  const isTyping =
    !!active &&
    (active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      (active as HTMLElement).isContentEditable);
  if (isTyping && key !== 'escape') return;

  if (key === 'j') {
    e.preventDefault();
    navigate(1);
  }
  if (key === 'k') {
    e.preventDefault();
    navigate(-1);
  }
  if (key === 'escape') {
    e.preventDefault();
    if (textareaRef.value) textareaRef.value.blur();
    focusMode.value = false;
  }
}

async function submitTranslation() {
  try {
    submitting.value = true;
    feedbackMessage.value = '';
    await apiSubmitTranslation(
      props.project,
      props.language,
      props.filename,
      currentKey.value,
      translationValue.value
    );
    feedbackMessage.value = 'Translation submitted for review';
    feedbackType.value = 'success';
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await refreshData();
  } catch (e) {
    feedbackMessage.value = 'Failed to submit: ' + (e as Error).message;
    feedbackType.value = 'error';
  } finally {
    submitting.value = false;
  }
}

async function approveSuggestion(id: number, status: 'approved' | 'rejected') {
  try {
    await approveTranslation(props.project, id, status);
    await refreshData();
  } catch (e) {
    alert('Failed to moderate: ' + (e as Error).message);
  }
}

async function deleteSuggestion(id: number) {
  if (!confirm('Delete this suggestion?')) return;
  try {
    await deleteTranslation(props.project, id);
    await refreshData();
  } catch (e) {
    alert('Failed to delete suggestion: ' + (e as Error).message);
  }
}

async function loadData() {
  try {
    loading.value = true;
    error.value = null;
    const result = await fetchTranslationFile(
      props.project,
      props.language,
      props.filename
    );
    dataSignal.value = result;
    loading.value = false;
    updateTranslationValue();
    focusTextarea();
  } catch (e) {
    error.value = 'Failed to load translation file: ' + (e as Error).message;
    loading.value = false;
  }
}

async function refreshData() {
  try {
    const result = await fetchTranslationFile(
      props.project,
      props.language,
      props.filename
    );
    dataSignal.value = result;
    if (currentIndex.value >= filteredKeys.value.length) {
      currentIndex.value = Math.max(0, filteredKeys.value.length - 1);
    }
    updateTranslationValue();
  } catch (e) {
    console.error('Failed to refresh data', e);
  }
}

// Keyboard shortcuts at document level
onMounted(() => {
  loadData();

  const handleDocumentKeydown = (e: KeyboardEvent) => {
    const key = (e.key || '').toLowerCase();
    const active = document.activeElement as HTMLElement | null;
    const isTyping =
      !!active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        (active as HTMLElement).isContentEditable);

    if (!isTyping) {
      if (key === 'j') {
        e.preventDefault();
        navigate(1);
      }
      if (key === 'k') {
        e.preventDefault();
        navigate(-1);
      }
    }
  };

  document.addEventListener('keydown', handleDocumentKeydown);

  return () => {
    document.removeEventListener('keydown', handleDocumentKeydown);
  };
});
</script>

<style scoped>
.btn.selected {
  background-color: var(--primary-color, #3b82f6);
  color: white;
}
</style>
