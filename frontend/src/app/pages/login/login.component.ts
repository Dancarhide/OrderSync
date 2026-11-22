import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  mfaCode = '';
  mfaRequired = false;
  showPassword = false;
  loading = false;
  error = '';

  constructor(private router: Router, private authService: AuthService) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  cancelMfa() {
    this.mfaRequired = false;
    this.mfaCode = '';
    this.error = '';
  }

  onSubmit() {
    this.error = '';
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Enter your email and password.';
      return;
    }
    if (this.mfaRequired && !this.mfaCode.trim()) {
      this.error = 'Enter the 6-digit MFA verification code.';
      return;
    }

    this.loading = true;
    this.authService.login(this.email, this.password, this.mfaRequired ? this.mfaCode : undefined).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.mfaRequired) {
          this.mfaRequired = true;
          this.mfaCode = '';
          return;
        }
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.error || 'Invalid email or password';
      }
    });
  }
}

