import { Component } from 'solid-js';

const HomePage: Component = () => {
  return (
    <div class="container py-xl">
      <div class="text-center">
        <h1 class="text-2xl lg:text-3xl font-bold mb-md">
          I18n Platform
        </h1>
        <p class="text-lg text-muted mb-lg max-w-2xl mx-auto">
          Lightweight internationalization platform with seamless GitHub integration. 
          Collaborate on translations with your team efficiently.
        </p>
        <div class="flex gap-md justify-center flex-col md:flex-row">
          <a href="/login" class="btn btn-primary">
            Get Started with GitHub
          </a>
          <a href="#features" class="btn btn-secondary">
            Learn More
          </a>
        </div>
      </div>
      
      <section id="features" class="mt-2xl">
        <div class="grid gap-lg md:grid-cols-3">
          <div class="card">
            <div class="card-body text-center">
              <h3 class="text-lg font-semibold mb-sm">GitHub Integration</h3>
              <p class="text-sm text-muted">
                Seamless integration with GitHub repositories. 
                Translations are automatically committed with proper attribution.
              </p>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body text-center">
              <h3 class="text-lg font-semibold mb-sm">Lightweight & Fast</h3>
              <p class="text-sm text-muted">
                Minimal server requirements with support for both serverless 
                and traditional deployments.
              </p>
            </div>
          </div>
          
          <div class="card">
            <div class="card-body text-center">
              <h3 class="text-lg font-semibold mb-sm">Cross-Platform</h3>
              <p class="text-sm text-muted">
                Optimized for both desktop and mobile devices with 
                responsive design and touch-friendly interactions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;