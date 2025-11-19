import { ParentComponent, Show } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { useAuth } from '../auth';

export const KawaiiLayout: ParentComponent = (props) => {
    const { user, login, logout } = useAuth();
    const location = useLocation();

    return (
        <div class="min-h-screen bg-neutral-50 font-sans text-neutral-800 selection:bg-primary-200 selection:text-primary-900">
            {/* Cat Ear Header Background */}
            <div class="fixed top-0 left-0 right-0 h-2 bg-primary-400 z-50" />

            {/* Navigation */}
            <nav class="fixed top-2 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-neutral-100 z-40">
                <div class="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <A href="/" class="flex items-center gap-2 group">
                        <div class="text-2xl transform group-hover:scale-110 transition-transform duration-200">🐱</div>
                        <span class="font-serif font-bold text-xl text-neutral-800 group-hover:text-primary-500 transition-colors">
                            Koro i18n
                        </span>
                    </A>

                    <div class="flex items-center gap-6">
                        <Show when={user()}>
                            <div class="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-600">
                                <A href="/projects" class="hover:text-primary-500 transition-colors" activeClass="text-primary-500 font-bold">
                                    Projects
                                </A>
                                <A href="/docs" class="hover:text-primary-500 transition-colors" activeClass="text-primary-500 font-bold">
                                    Docs
                                </A>
                            </div>
                        </Show>

                        <div class="flex items-center gap-3">
                            <Show when={user()} fallback={
                                <button onClick={() => login()} class="btn-primary text-sm">
                                    <span>Sign In</span>
                                    <div class="i-carbon-logo-github text-lg" />
                                </button>
                            }>
                                <div class="flex items-center gap-3 pl-6 border-l border-neutral-200">
                                    <img
                                        src={user()?.avatarUrl}
                                        alt={user()?.username}
                                        class="w-8 h-8 rounded-full border-2 border-primary-200"
                                    />
                                    <button
                                        onClick={() => logout()}
                                        class="text-sm text-neutral-500 hover:text-secondary-500 transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </Show>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main class="pt-24 pb-12 px-4 min-h-[calc(100vh-4rem)]">
                <div class="max-w-5xl mx-auto animate-fade-in-up">
                    {props.children}
                </div>
            </main>

            {/* Footer */}
            <footer class="py-8 text-center text-neutral-400 text-sm">
                <div class="flex justify-center gap-4 mb-4">
                    <span class="w-2 h-2 rounded-full bg-primary-200" />
                    <span class="w-2 h-2 rounded-full bg-secondary-200" />
                    <span class="w-2 h-2 rounded-full bg-primary-200" />
                </div>
                <p>© {new Date().getFullYear()} Koro i18n Platform</p>
                <p class="mt-1 text-xs">Made with 🐾 by f3liz-dev</p>
            </footer>
        </div>
    );
};
