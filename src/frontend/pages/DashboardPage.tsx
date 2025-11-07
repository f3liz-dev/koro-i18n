import { Component } from 'solid-js';
import AuthGuard from '../components/auth/AuthGuard';
import UserProfile from '../components/auth/UserProfile';

const DashboardPage: Component = () => {
  return (
    <AuthGuard>
      <div class="container py-lg">
        <div class="mb-lg flex justify-between items-start">
          <div>
            <h1 class="text-2xl font-bold mb-sm">Dashboard</h1>
            <p class="text-muted">Manage your translation projects</p>
          </div>
          <UserProfile />
        </div>
        
        <div class="card">
          <div class="card-body">
            <p class="text-center text-muted py-xl">
              Dashboard functionality will be implemented in subsequent tasks.
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
};

export default DashboardPage;