import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslationService, SupportedLanguage } from '../../services/translation.service';

export type UserRole = 'Admin' | 'Operator';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  activeTab: 'general' | 'roles' | 'channels' = 'general';
  currentUserEmail = 'admin@ordersync.app';
  currentRole: UserRole = (localStorage.getItem('ordersync_role') as UserRole) || 'Admin';

  savedNotification = false;

  constructor(
    private router: Router,
    public translationService: TranslationService
  ) {}

  get t() {
    return this.translationService.t;
  }

  get currentLang(): SupportedLanguage {
    return this.translationService.currentLang;
  }

  setLanguage(lang: SupportedLanguage) {
    this.translationService.setLanguage(lang);
    this.showSaveFeedback();
  }

  setRole(role: UserRole) {
    this.currentRole = role;
    localStorage.setItem('ordersync_role', role);
    this.showSaveFeedback();
  }

  showSaveFeedback() {
    this.savedNotification = true;
    setTimeout(() => {
      this.savedNotification = false;
    }, 2500);
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
