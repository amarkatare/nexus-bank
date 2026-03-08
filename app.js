// ===== NEXUSBANK APPLICATION =====
// Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://vcixnxxkrbgkdeteleuy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaXhueHhrcmJna2RldGVsZXV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDk0MDIsImV4cCI6MjA4ODUyNTQwMn0.vXKIyt0RSu2ZVg35acKfBQ3ybVYrAID2Fs3Yss6KX7A';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== STATE =====
let currentUser = null;
let currentProfile = null;
let currentTab = 'home';
let recipientData = null;
let otpTimer = null;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  renderApp();
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadProfile();
    showPage('dashboard');
    loadDashboardData();
  } else {
    showPage('login');
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadProfile();
      showPage('dashboard');
      loadDashboardData();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      showPage('login');
    }
  });
});

// ===== RENDER APP =====
function renderApp() {
  document.getElementById('app').innerHTML = `
    ${renderLoginPage()}
    ${renderSignupPage()}
    ${renderForgotPage()}
    ${renderOTPPage()}
    ${renderResetPage()}
    ${renderDashboardPage()}
  `;
  attachLoginEvents();
  attachSignupEvents();
  attachForgotEvents();
  attachOTPEvents();
  attachResetEvents();
  attachDashboardEvents();
}

// ===== PAGE RENDERER HELPERS =====
function renderBrandHeader(subtitle = 'Secure Net Banking') {
  return `
    <div class="brand-header">
      <div class="brand-logo">
        <div class="logo-mark">🏦</div>
        <div class="brand-name">Nexus<span>Bank</span></div>
      </div>
      <p class="auth-subtitle">${subtitle}</p>
    </div>
  `;
}

// ===== LOGIN PAGE =====
function renderLoginPage() {
  return `
    <div class="page auth-layout" id="login-page">
      <div class="auth-card">
        ${renderBrandHeader('Sign in to your account')}
        <div id="login-alert"></div>
        <div class="form-group">
          <label class="form-label">Account No. or Email</label>
          <input class="form-input" id="login-identifier" type="text" placeholder="Enter account no. or email" autocomplete="username" />
        </div>
        <div class="form-group">
          <label class="form-label">Password</label>
          <div class="form-input-wrapper">
            <input class="form-input has-icon" id="login-password" type="password" placeholder="Enter your password" autocomplete="current-password" />
            <span class="form-input-icon" onclick="togglePwd('login-password', this)">👁</span>
          </div>
        </div>
        <div style="text-align:right; margin-bottom:20px;">
          <a class="text-link" onclick="showPage('forgot')">Forgot password?</a>
        </div>
        <button class="btn btn-primary" id="login-btn" onclick="handleLogin()">
          Sign In
        </button>
        <div class="form-footer">
          Don't have an account? <a class="text-link" onclick="showPage('signup')">Create Account</a>
        </div>
      </div>
    </div>
  `;
}

// ===== SIGNUP PAGE =====
function renderSignupPage() {
  return `
    <div class="page auth-layout" id="signup-page">
      <div class="auth-card" style="max-width:520px;">
        ${renderBrandHeader('Create your account')}
        <div class="step-dots">
          <div class="step-dot active" id="dot-1"></div>
          <div class="step-dot" id="dot-2"></div>
          <div class="step-dot" id="dot-3"></div>
        </div>
        <div id="signup-alert"></div>

        <!-- Step 1: Personal Info -->
        <div id="signup-step-1">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <input class="form-input" id="signup-fname" type="text" placeholder="John" />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <input class="form-input" id="signup-lname" type="text" placeholder="Doe" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input class="form-input" id="signup-email" type="email" placeholder="john@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Mobile Number</label>
            <input class="form-input" id="signup-mobile" type="tel" placeholder="+91 98765 43210" maxlength="15" />
          </div>
          <button class="btn btn-primary" onclick="signupStep1Next()">Continue →</button>
        </div>

        <!-- Step 2: Security -->
        <div id="signup-step-2" style="display:none;">
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <input class="form-input" id="signup-dob" type="date" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="form-input-wrapper">
              <input class="form-input has-icon" id="signup-password" type="password" placeholder="Min 8 characters" />
              <span class="form-input-icon" onclick="togglePwd('signup-password', this)">👁</span>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <div class="form-input-wrapper">
              <input class="form-input has-icon" id="signup-confirm-password" type="password" placeholder="Repeat password" />
              <span class="form-input-icon" onclick="togglePwd('signup-confirm-password', this)">👁</span>
            </div>
          </div>
          <div style="display:flex;gap:12px;">
            <button class="btn btn-ghost" style="flex:0 0 auto;" onclick="signupGoStep(1)">← Back</button>
            <button class="btn btn-primary" onclick="signupStep2Next()">Continue →</button>
          </div>
        </div>

        <!-- Step 3: Review & Submit -->
        <div id="signup-step-3" style="display:none;">
          <div id="signup-review"></div>
          <div style="display:flex;gap:12px;margin-top:20px;">
            <button class="btn btn-ghost" style="flex:0 0 auto;" onclick="signupGoStep(2)">← Back</button>
            <button class="btn btn-primary" id="signup-submit-btn" onclick="handleSignup()">Create Account 🎉</button>
          </div>
        </div>

        <div class="form-footer">
          Already have an account? <a class="text-link" onclick="showPage('login')">Sign In</a>
        </div>
      </div>
    </div>
  `;
}

// ===== FORGOT PASSWORD PAGE =====
function renderForgotPage() {
  return `
    <div class="page auth-layout" id="forgot-page">
      <div class="auth-card">
        ${renderBrandHeader('Reset your password')}
        <p style="color:var(--text-secondary);font-size:14px;margin-bottom:24px;">Enter your registered email and we'll send you a 6-digit OTP to reset your password.</p>
        <div id="forgot-alert"></div>
        <div class="form-group">
          <label class="form-label">Registered Email</label>
          <input class="form-input" id="forgot-email" type="email" placeholder="your@email.com" />
        </div>
        <button class="btn btn-primary" id="forgot-btn" onclick="handleForgotPassword()">Send OTP</button>
        <div class="form-footer">
          <a class="text-link" onclick="showPage('login')">← Back to Sign In</a>
        </div>
      </div>
    </div>
  `;
}

// ===== OTP PAGE =====
function renderOTPPage() {
  return `
    <div class="page auth-layout" id="otp-page">
      <div class="auth-card">
        ${renderBrandHeader('Verify OTP')}
        <p style="color:var(--text-secondary);font-size:14px;margin-bottom:8px;text-align:center;">We've sent a 6-digit OTP to</p>
        <p id="otp-email-display" style="color:var(--gold-400);font-weight:600;font-size:14px;text-align:center;margin-bottom:8px;"></p>
        <p id="otp-timer" style="color:var(--text-muted);font-size:13px;text-align:center;margin-bottom:4px;"></p>
        <div id="otp-alert"></div>
        <div class="otp-group">
          <input class="otp-input" id="otp-0" maxlength="1" type="text" inputmode="numeric" pattern="[0-9]" />
          <input class="otp-input" id="otp-1" maxlength="1" type="text" inputmode="numeric" pattern="[0-9]" />
          <input class="otp-input" id="otp-2" maxlength="1" type="text" inputmode="numeric" pattern="[0-9]" />
          <input class="otp-input" id="otp-3" maxlength="1" type="text" inputmode="numeric" pattern="[0-9]" />
          <input class="otp-input" id="otp-4" maxlength="1" type="text" inputmode="numeric" pattern="[0-9]" />
          <input class="otp-input" id="otp-5" maxlength="1" type="text" inputmode="numeric" pattern="[0-9]" />
        </div>
        <button class="btn btn-primary" id="otp-verify-btn" onclick="handleOTPVerify()">Verify OTP</button>
        <div class="form-footer">
          Didn't receive? <a class="text-link" id="resend-link" onclick="resendOTP()">Resend OTP</a>
        </div>
      </div>
    </div>
  `;
}

// ===== RESET PASSWORD PAGE =====
function renderResetPage() {
  return `
    <div class="page auth-layout" id="reset-page">
      <div class="auth-card">
        ${renderBrandHeader('Set new password')}
        <div id="reset-alert"></div>
        <div class="form-group">
          <label class="form-label">New Password</label>
          <div class="form-input-wrapper">
            <input class="form-input has-icon" id="reset-password" type="password" placeholder="Min 8 characters" />
            <span class="form-input-icon" onclick="togglePwd('reset-password', this)">👁</span>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Confirm New Password</label>
          <div class="form-input-wrapper">
            <input class="form-input has-icon" id="reset-confirm-password" type="password" placeholder="Repeat password" />
            <span class="form-input-icon" onclick="togglePwd('reset-confirm-password', this)">👁</span>
          </div>
        </div>
        <button class="btn btn-primary" id="reset-btn" onclick="handleResetPassword()">Reset Password</button>
      </div>
    </div>
  `;
}

// ===== DASHBOARD PAGE =====
function renderDashboardPage() {
  return `
    <div class="page" id="dashboard-page">
      <div class="topbar">
        <div class="topbar-brand">
          <div class="logo-mark">🏦</div>
          <span>Nexus<span style="color:var(--gold-400)">Bank</span></span>
        </div>
        <div class="nav-tabs" id="desktop-nav">
          <button class="nav-tab active" onclick="switchTab('home', this)">🏠 Home</button>
          <button class="nav-tab" onclick="switchTab('transfer', this)">💸 Send Money</button>
          <button class="nav-tab" onclick="switchTab('transactions', this)">📋 Transactions</button>
          <button class="nav-tab" onclick="switchTab('profile', this)">👤 Profile</button>
        </div>
        <div class="topbar-right">
          <div class="user-avatar" id="user-avatar-btn" title="Profile">?</div>
          <button class="btn btn-ghost btn-sm" onclick="handleLogout()">Sign Out</button>
        </div>
      </div>

      <div class="dashboard-content">

        <!-- HOME TAB -->
        <div class="tab-content active" id="tab-home">
          <div class="balance-card">
            <div class="balance-card-inner">
              <div class="balance-header">
                <div>
                  <div class="account-label">Savings Account</div>
                  <div class="account-number" id="db-account-no">•••• •••• ••••</div>
                </div>
                <div class="card-chip"><div class="card-chip-lines"></div></div>
              </div>
              <div class="balance-amount">
                <span class="currency">₹</span><span id="db-balance">0.00</span>
              </div>
              <div class="balance-label">Available Balance</div>
              <div class="balance-footer">
                <div class="account-holder" id="db-holder-name">Loading...</div>
                <div class="quick-actions">
                  <button class="quick-btn quick-btn-primary" onclick="switchTab('transfer', null)">💸 Send</button>
                  <button class="quick-btn quick-btn-outline" onclick="switchTab('transactions', null)">📋 History</button>
                </div>
              </div>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-card">
              <div class="stat-icon green">📥</div>
              <div class="stat-value" id="stat-credited">₹0</div>
              <div class="stat-label">Total Received</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon red">📤</div>
              <div class="stat-value" id="stat-debited">₹0</div>
              <div class="stat-label">Total Sent</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon gold">🔄</div>
              <div class="stat-value" id="stat-txn-count">0</div>
              <div class="stat-label">Transactions</div>
            </div>
          </div>

          <div class="section-header">
            <div class="section-title">Recent Transactions</div>
            <a class="text-link" onclick="switchTab('transactions', null)">View All</a>
          </div>
          <div class="transactions-list" id="recent-txns">
            <div class="empty-state"><div class="empty-state-icon">💳</div><p>No recent transactions</p></div>
          </div>
        </div>

        <!-- SEND MONEY TAB -->
        <div class="tab-content" id="tab-transfer">
          <div class="section-title" style="margin-bottom:20px;">💸 Send Money</div>
          <div class="panel">
            <div id="transfer-step-1">
              <div class="form-group">
                <label class="form-label">Recipient Account No. or Email</label>
                <div style="display:flex;gap:10px;">
                  <input class="form-input" id="transfer-recipient" type="text" placeholder="Account no. or email" />
                  <button class="btn btn-ghost" onclick="lookupRecipient()" style="white-space:nowrap;">🔍 Find</button>
                </div>
              </div>

              <div id="recipient-result"></div>

              <div class="form-group" id="amount-group" style="display:none;margin-top:20px;">
                <label class="form-label">Amount (₹)</label>
                <div class="amount-wrapper">
                  <span class="amount-prefix">₹</span>
                  <input class="form-input amount-input" id="transfer-amount" type="number" placeholder="0.00" min="1" />
                </div>
              </div>

              <div class="form-group" id="remark-group" style="display:none;">
                <label class="form-label">Remark (Optional)</label>
                <input class="form-input" id="transfer-remark" type="text" placeholder="e.g., Rent, Friends, etc." maxlength="80" />
              </div>

              <button class="btn btn-primary" id="proceed-btn" style="display:none;" onclick="proceedTransfer()">
                Review Transfer
              </button>
            </div>
          </div>
        </div>

        <!-- TRANSACTIONS TAB -->
        <div class="tab-content" id="tab-transactions">
          <div class="section-header">
            <div class="section-title">📋 Transaction History</div>
          </div>
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input class="form-input search-input" id="txn-search" type="text" placeholder="Search by name, amount or date..." oninput="filterTransactions(this.value)" />
          </div>
          <div class="transactions-list" id="all-txns">
            <div class="empty-state"><div class="empty-state-icon">💳</div><p>No transactions yet</p></div>
          </div>
        </div>

        <!-- PROFILE TAB -->
        <div class="tab-content" id="tab-profile">
          <div class="section-title" style="margin-bottom:20px;">👤 My Profile</div>
          <div class="profile-grid">
            <div class="profile-card">
              <div class="profile-avatar-lg" id="profile-avatar-lg">?</div>
              <div class="profile-name-lg" id="profile-name-lg">Loading...</div>
              <div class="profile-email" id="profile-email-lg">—</div>
              <span class="profile-badge">Premium Member</span>
              <hr class="sep" style="margin-top:20px;" />
              <div style="text-align:left;margin-top:4px;">
                <div class="info-label" style="margin-bottom:6px;">Member since</div>
                <div id="profile-since" style="font-size:14px;font-weight:500;">—</div>
              </div>
            </div>
            <div class="info-card">
              <div class="section-title" style="margin-bottom:20px;">Account Details</div>
              <div class="info-row">
                <span class="info-label">Full Name</span>
                <span class="info-value" id="info-name">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Email</span>
                <span class="info-value" id="info-email">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Mobile</span>
                <span class="info-value" id="info-mobile">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date of Birth</span>
                <span class="info-value" id="info-dob">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Account Number</span>
                <span class="info-value mono" id="info-accno">—</span>
              </div>
              <div class="info-row">
                <span class="info-label">Balance</span>
                <span class="info-value" id="info-balance" style="color:var(--gold-400);font-family:var(--font-display);font-size:18px;">₹0.00</span>
              </div>
              <div style="margin-top:20px;">
                <button class="btn btn-danger btn-sm" onclick="handleLogout()">🚪 Sign Out</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Mobile Navigation -->
      <nav class="mobile-nav">
        <div class="mobile-nav-items">
          <button class="mobile-nav-item active" id="mnav-home" onclick="switchTab('home', null, true)">
            <span>🏠</span><span>Home</span>
          </button>
          <button class="mobile-nav-item" id="mnav-transfer" onclick="switchTab('transfer', null, true)">
            <span>💸</span><span>Send</span>
          </button>
          <button class="mobile-nav-item" id="mnav-transactions" onclick="switchTab('transactions', null, true)">
            <span>📋</span><span>History</span>
          </button>
          <button class="mobile-nav-item" id="mnav-profile" onclick="switchTab('profile', null, true)">
            <span>👤</span><span>Profile</span>
          </button>
        </div>
      </nav>
    </div>
  `;
}

// ===== PAGE NAVIGATION =====
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`${name}-page`);
  if (page) {
    page.classList.add('active');
    window.scrollTo(0, 0);
  }
}

function switchTab(tab, clickedEl, fromMobile = false) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');

  // Desktop nav
  const desktopNav = document.getElementById('desktop-nav');
  if (desktopNav) {
    desktopNav.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const tabMap = { home: 0, transfer: 1, transactions: 2, profile: 3 };
    const idx = tabMap[tab];
    if (idx !== undefined) desktopNav.querySelectorAll('.nav-tab')[idx].classList.add('active');
  }

  // Mobile nav
  ['home','transfer','transactions','profile'].forEach(t => {
    const el = document.getElementById(`mnav-${t}`);
    if (el) el.classList.toggle('active', t === tab);
  });
}

// ===== TOGGLE PASSWORD =====
function togglePwd(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  iconEl.textContent = isPassword ? '🙈' : '👁';
}

// ===== ALERTS =====
function showAlert(containerId, type, message) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

function clearAlert(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = '';
}

// ===== TOAST =====
function toast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// ===== LOADING BUTTON =====
function setLoading(btnId, loading, text = null) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn._origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Please wait...`;
    btn.disabled = true;
  } else {
    btn.innerHTML = text || btn._origText || 'Submit';
    btn.disabled = false;
  }
}

// ===== FORMAT CURRENCY =====
function fmtINR(amount) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

// ===== FORMAT DATE =====
function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ===== GENERATE ACCOUNT NUMBER =====
function generateAccountNumber() {
  const prefix = '9876';
  const random = Math.floor(10000000000 + Math.random() * 89999999999).toString();
  return prefix + random.substring(0, 8);
}

// ===== LOGIN =====
function attachLoginEvents() {
  const inputs = ['login-identifier', 'login-password'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  });
}

async function handleLogin() {
  clearAlert('login-alert');
  const identifier = document.getElementById('login-identifier').value.trim();
  const password = document.getElementById('login-password').value;

  if (!identifier || !password) {
    showAlert('login-alert', 'error', '⚠️ Please enter your credentials.');
    return;
  }

  setLoading('login-btn', true);

  try {
    let email = identifier;

    // If looks like account number, look up the email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) {
      const { data: profile, error: profileErr } = await sb
        .from('profiles')
        .select('email')
        .eq('account_number', identifier)
        .single();

      if (profileErr || !profile) {
        showAlert('login-alert', 'error', '❌ Account number not found.');
        setLoading('login-btn', false, 'Sign In');
        return;
      }
      email = profile.email;
    }

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      showAlert('login-alert', 'error', `❌ ${error.message}`);
      setLoading('login-btn', false, 'Sign In');
    }
  } catch (e) {
    showAlert('login-alert', 'error', '❌ An unexpected error occurred.');
    setLoading('login-btn', false, 'Sign In');
  }
}

// ===== SIGNUP =====
let signupData = {};

function attachSignupEvents() {}

function signupGoStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`signup-step-${i}`);
    if (el) el.style.display = i === step ? 'block' : 'none';
    const dot = document.getElementById(`dot-${i}`);
    if (dot) dot.classList.toggle('active', i === step);
  }
}

function signupStep1Next() {
  clearAlert('signup-alert');
  const fname = document.getElementById('signup-fname').value.trim();
  const lname = document.getElementById('signup-lname').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const mobile = document.getElementById('signup-mobile').value.trim();

  if (!fname || !lname || !email || !mobile) {
    showAlert('signup-alert', 'error', '⚠️ All fields are required.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert('signup-alert', 'error', '⚠️ Please enter a valid email address.');
    return;
  }
  if (mobile.replace(/\D/g,'').length < 10) {
    showAlert('signup-alert', 'error', '⚠️ Please enter a valid mobile number.');
    return;
  }

  signupData.first_name = fname;
  signupData.last_name = lname;
  signupData.email = email;
  signupData.mobile = mobile;
  signupGoStep(2);
}

function signupStep2Next() {
  clearAlert('signup-alert');
  const dob = document.getElementById('signup-dob').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm-password').value;

  if (!dob || !password || !confirm) {
    showAlert('signup-alert', 'error', '⚠️ All fields are required.');
    return;
  }
  if (password.length < 8) {
    showAlert('signup-alert', 'error', '⚠️ Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    showAlert('signup-alert', 'error', '⚠️ Passwords do not match.');
    return;
  }

  signupData.dob = dob;
  signupData.password = password;

  // Show review
  document.getElementById('signup-review').innerHTML = `
    <div style="background:rgba(245,200,66,0.06);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:8px;">
      <div class="info-row"><span class="info-label">Name</span><span class="info-value">${signupData.first_name} ${signupData.last_name}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${signupData.email}</span></div>
      <div class="info-row"><span class="info-label">Mobile</span><span class="info-value">${signupData.mobile}</span></div>
      <div class="info-row"><span class="info-label">Date of Birth</span><span class="info-value">${new Date(signupData.dob).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</span></div>
    </div>
    <p style="font-size:13px;color:var(--text-secondary);">✅ By creating an account, you agree to our Terms & Conditions.</p>
  `;

  signupGoStep(3);
}

async function handleSignup() {
  clearAlert('signup-alert');
  setLoading('signup-submit-btn', true);

  try {
    const accountNumber = generateAccountNumber();

    const { data: authData, error: authError } = await sb.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          first_name: signupData.first_name,
          last_name: signupData.last_name,
        }
      }
    });

    if (authError) {
      showAlert('signup-alert', 'error', `❌ ${authError.message}`);
      setLoading('signup-submit-btn', false, 'Create Account 🎉');
      return;
    }

    if (authData.user) {
      const { error: profileError } = await sb.from('profiles').insert({
        id: authData.user.id,
        email: signupData.email,
        first_name: signupData.first_name,
        last_name: signupData.last_name,
        mobile: signupData.mobile,
        dob: signupData.dob,
        account_number: accountNumber,
        balance: 10000.00 // Welcome bonus ₹10,000
      });

      if (profileError) {
        showAlert('signup-alert', 'error', `❌ Profile creation failed: ${profileError.message}`);
        setLoading('signup-submit-btn', false, 'Create Account 🎉');
        return;
      }

      showAlert('signup-alert', 'success', `🎉 Account created! Your account no: <strong>${accountNumber}</strong>. Please verify your email if required, then sign in.`);
      setLoading('signup-submit-btn', false, 'Create Account 🎉');
      setTimeout(() => showPage('login'), 4000);
    }
  } catch (e) {
    showAlert('signup-alert', 'error', '❌ Unexpected error. Please try again.');
    setLoading('signup-submit-btn', false, 'Create Account 🎉');
  }
}

// ===== FORGOT PASSWORD =====
let forgotEmail = '';

function attachForgotEvents() {
  const el = document.getElementById('forgot-email');
  if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') handleForgotPassword(); });
}

async function handleForgotPassword() {
  clearAlert('forgot-alert');
  const email = document.getElementById('forgot-email').value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showAlert('forgot-alert', 'error', '⚠️ Please enter a valid email address.');
    return;
  }

  setLoading('forgot-btn', true);

  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/?reset=true'
    });

    if (error) {
      showAlert('forgot-alert', 'error', `❌ ${error.message}`);
    } else {
      forgotEmail = email;
      showAlert('forgot-alert', 'success', `✅ Password reset link sent to <strong>${email}</strong>. Check your inbox.`);
      // For demo: use OTP flow simulation
      document.getElementById('otp-email-display').textContent = email;
      window._forgotEmail = email;
      startOTPTimer();
      setTimeout(() => showPage('otp'), 2000);
    }
  } catch(e) {
    showAlert('forgot-alert', 'error', '❌ An error occurred. Please try again.');
  }

  setLoading('forgot-btn', false, 'Send OTP');
}

// ===== OTP =====
function attachOTPEvents() {
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`otp-${i}`);
    if (!el) continue;
    el.addEventListener('input', e => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      if (e.target.value && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !e.target.value && i > 0) document.getElementById(`otp-${i-1}`)?.focus();
    });
    el.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((char, idx) => {
        const inp = document.getElementById(`otp-${idx}`);
        if (inp) inp.value = char;
      });
      document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
    });
  }
}

function startOTPTimer() {
  let seconds = 120;
  clearInterval(otpTimer);
  const timerEl = document.getElementById('otp-timer');
  const resendEl = document.getElementById('resend-link');
  if (resendEl) resendEl.style.opacity = '0.4';

  otpTimer = setInterval(() => {
    const m = Math.floor(seconds / 60).toString().padStart(2,'0');
    const s = (seconds % 60).toString().padStart(2,'0');
    if (timerEl) timerEl.textContent = `OTP expires in ${m}:${s}`;
    if (seconds <= 0) {
      clearInterval(otpTimer);
      if (timerEl) timerEl.textContent = 'OTP expired. Please request a new one.';
      if (resendEl) resendEl.style.opacity = '1';
    }
    seconds--;
  }, 1000);
}

async function handleOTPVerify() {
  clearAlert('otp-alert');
  const otp = Array.from({length:6}, (_,i) => document.getElementById(`otp-${i}`)?.value || '').join('');

  if (otp.length < 6) {
    showAlert('otp-alert', 'error', '⚠️ Please enter the complete 6-digit OTP.');
    return;
  }

  setLoading('otp-verify-btn', true);

  try {
    // Supabase uses token-based reset; for email OTP verification:
    const { error } = await sb.auth.verifyOtp({
      email: window._forgotEmail || '',
      token: otp,
      type: 'recovery'
    });

    if (error) {
      showAlert('otp-alert', 'error', `❌ ${error.message}`);
    } else {
      clearInterval(otpTimer);
      toast('OTP verified! Set your new password.', 'success');
      showPage('reset');
    }
  } catch(e) {
    showAlert('otp-alert', 'error', '❌ Verification failed.');
  }

  setLoading('otp-verify-btn', false, 'Verify OTP');
}

async function resendOTP() {
  if (!window._forgotEmail) return;
  await sb.auth.resetPasswordForEmail(window._forgotEmail, {
    redirectTo: window.location.origin + '/?reset=true'
  });
  toast('OTP resent to ' + window._forgotEmail, 'info');
  startOTPTimer();
  clearAlert('otp-alert');
  for (let i = 0; i < 6; i++) { const el = document.getElementById(`otp-${i}`); if (el) el.value = ''; }
  document.getElementById('otp-0')?.focus();
}

// ===== RESET PASSWORD =====
function attachResetEvents() {
  // Check if on reset page (from email link)
  const params = new URLSearchParams(window.location.search);
  if (params.get('reset') === 'true') showPage('reset');
}

async function handleResetPassword() {
  clearAlert('reset-alert');
  const password = document.getElementById('reset-password').value;
  const confirm = document.getElementById('reset-confirm-password').value;

  if (!password || !confirm) {
    showAlert('reset-alert', 'error', '⚠️ Please fill in all fields.');
    return;
  }
  if (password.length < 8) {
    showAlert('reset-alert', 'error', '⚠️ Password must be at least 8 characters.');
    return;
  }
  if (password !== confirm) {
    showAlert('reset-alert', 'error', '⚠️ Passwords do not match.');
    return;
  }

  setLoading('reset-btn', true);

  try {
    const { error } = await sb.auth.updateUser({ password });
    if (error) {
      showAlert('reset-alert', 'error', `❌ ${error.message}`);
    } else {
      toast('Password reset successfully! Please sign in.', 'success');
      await sb.auth.signOut();
      setTimeout(() => showPage('login'), 2000);
    }
  } catch(e) {
    showAlert('reset-alert', 'error', '❌ An error occurred.');
  }

  setLoading('reset-btn', false, 'Reset Password');
}

// ===== LOAD PROFILE =====
async function loadProfile() {
  if (!currentUser) return;
  const { data, error } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  if (!error && data) currentProfile = data;
}

// ===== DASHBOARD DATA =====
async function loadDashboardData() {
  if (!currentProfile) await loadProfile();
  if (!currentProfile) return;

  // Update UI
  const accDisplay = currentProfile.account_number.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
  setText('db-account-no', accDisplay);
  setText('db-balance', fmtINR(currentProfile.balance || 0));
  setText('db-holder-name', `${currentProfile.first_name} ${currentProfile.last_name}`.toUpperCase());

  // User avatar
  const initials = (currentProfile.first_name[0] + currentProfile.last_name[0]).toUpperCase();
  setText('user-avatar-btn', initials);
  setText('profile-avatar-lg', initials);
  setText('profile-name-lg', `${currentProfile.first_name} ${currentProfile.last_name}`);
  setText('profile-email-lg', currentProfile.email);
  setText('profile-since', new Date(currentProfile.created_at || Date.now()).toLocaleDateString('en-IN', {month:'long', year:'numeric'}));

  // Info card
  setText('info-name', `${currentProfile.first_name} ${currentProfile.last_name}`);
  setText('info-email', currentProfile.email);
  setText('info-mobile', currentProfile.mobile || '—');
  setText('info-dob', currentProfile.dob ? new Date(currentProfile.dob).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'}) : '—');
  setText('info-accno', currentProfile.account_number);
  setText('info-balance', '₹' + fmtINR(currentProfile.balance || 0));

  // Load transactions
  await loadTransactions();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ===== LOAD TRANSACTIONS =====
let allTransactions = [];

async function loadTransactions() {
  if (!currentProfile) return;

  const { data, error } = await sb
    .from('transactions')
    .select('*')
    .or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`)
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

  allTransactions = data || [];

  let totalCredit = 0, totalDebit = 0;
  allTransactions.forEach(t => {
    if (t.receiver_id === currentProfile.id) totalCredit += parseFloat(t.amount);
    else totalDebit += parseFloat(t.amount);
  });

  setText('stat-credited', '₹' + fmtINR(totalCredit));
  setText('stat-debited', '₹' + fmtINR(totalDebit));
  setText('stat-txn-count', allTransactions.length);

  renderTransactionsList('recent-txns', allTransactions.slice(0, 5));
  renderTransactionsList('all-txns', allTransactions);
}

function renderTransactionsList(containerId, txns) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!txns || txns.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💳</div><p>No transactions found</p></div>`;
    return;
  }

  container.innerHTML = txns.map(t => {
    const isCredit = t.receiver_id === currentProfile.id;
    const name = isCredit ? (t.sender_name || 'Unknown') : (t.receiver_name || 'Unknown');
    const ref = t.reference || t.id.substring(0,8).toUpperCase();

    return `
      <div class="transaction-item">
        <div class="txn-icon ${isCredit ? 'credit' : 'debit'}">${isCredit ? '📥' : '📤'}</div>
        <div class="txn-info">
          <div class="txn-name">${isCredit ? 'Received from' : 'Sent to'} ${name}</div>
          <div class="txn-date">${fmtDate(t.created_at)}</div>
          ${t.remark ? `<div class="txn-ref">💬 ${t.remark}</div>` : `<div class="txn-ref">Ref: ${ref}</div>`}
        </div>
        <div>
          <div class="txn-amount ${isCredit ? 'credit' : 'debit'}">${isCredit ? '+' : '-'}₹${fmtINR(t.amount)}</div>
          <div style="text-align:right;margin-top:4px;"><span class="badge badge-success" style="font-size:10px;">✓ Done</span></div>
        </div>
      </div>
    `;
  }).join('');
}

function filterTransactions(query) {
  if (!query) {
    renderTransactionsList('all-txns', allTransactions);
    return;
  }
  const q = query.toLowerCase();
  const filtered = allTransactions.filter(t => {
    const name = (t.sender_name + ' ' + t.receiver_name).toLowerCase();
    const amt = String(t.amount);
    const date = fmtDate(t.created_at).toLowerCase();
    const remark = (t.remark || '').toLowerCase();
    return name.includes(q) || amt.includes(q) || date.includes(q) || remark.includes(q);
  });
  renderTransactionsList('all-txns', filtered);
}

// ===== RECIPIENT LOOKUP =====
async function lookupRecipient() {
  const query = document.getElementById('transfer-recipient').value.trim();
  const resultEl = document.getElementById('recipient-result');
  const amountGroup = document.getElementById('amount-group');
  const remarkGroup = document.getElementById('remark-group');
  const proceedBtn = document.getElementById('proceed-btn');

  resultEl.innerHTML = '';
  amountGroup.style.display = 'none';
  remarkGroup.style.display = 'none';
  proceedBtn.style.display = 'none';
  recipientData = null;

  if (!query) {
    toast('Please enter an account number or email.', 'error');
    return;
  }

  // Show loading
  resultEl.innerHTML = `<div style="padding:12px;color:var(--text-secondary);font-size:14px;">🔍 Searching...</div>`;

  try {
    let q;
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(query)) {
      q = sb.from('profiles').select('id,first_name,last_name,account_number,email').eq('email', query);
    } else {
      q = sb.from('profiles').select('id,first_name,last_name,account_number,email').eq('account_number', query);
    }

    const { data, error } = await q.single();

    if (error || !data) {
      resultEl.innerHTML = `<div class="alert alert-error">❌ No account found with that details. Only existing NexusBank users can receive money.</div>`;
      return;
    }

    if (data.id === currentProfile.id) {
      resultEl.innerHTML = `<div class="alert alert-error">⚠️ You cannot send money to yourself.</div>`;
      return;
    }

    recipientData = data;
    const initials = (data.first_name[0] + data.last_name[0]).toUpperCase();

    resultEl.innerHTML = `
      <div class="recipient-card">
        <div class="recipient-avatar">${initials}</div>
        <div>
          <div class="recipient-name">✅ ${data.first_name} ${data.last_name}</div>
          <div class="recipient-acc">${data.account_number}</div>
        </div>
      </div>
    `;

    amountGroup.style.display = 'block';
    remarkGroup.style.display = 'block';
    proceedBtn.style.display = 'flex';
    document.getElementById('transfer-amount').focus();

  } catch(e) {
    resultEl.innerHTML = `<div class="alert alert-error">❌ Search failed. Please try again.</div>`;
  }
}

// ===== PROCEED TRANSFER =====
function proceedTransfer() {
  const amount = parseFloat(document.getElementById('transfer-amount').value);
  const remark = document.getElementById('transfer-remark').value.trim();

  if (!recipientData) { toast('Please find a recipient first.', 'error'); return; }
  if (!amount || amount <= 0) { toast('Please enter a valid amount.', 'error'); return; }
  if (amount < 1) { toast('Minimum transfer amount is ₹1.', 'error'); return; }
  if (amount > (currentProfile.balance || 0)) {
    toast('Insufficient balance!', 'error');
    return;
  }

  showTransferConfirmModal(recipientData, amount, remark);
}

// ===== TRANSFER CONFIRM MODAL =====
function showTransferConfirmModal(recipient, amount, remark) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-modal';

  overlay.innerHTML = `
    <div class="modal">
      <button class="modal-close" onclick="document.getElementById('confirm-modal').remove()">✕</button>
      <div class="modal-title">Confirm Transfer</div>
      <div class="modal-subtitle">Please review the details before confirming.</div>

      <div class="confirm-amount">₹${fmtINR(amount)}</div>

      <div class="confirm-row">
        <span class="confirm-label">Sending To</span>
        <span class="confirm-value">${recipient.first_name} ${recipient.last_name}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-label">Account No.</span>
        <span class="confirm-value" style="font-family:var(--font-mono);font-size:13px;">${recipient.account_number}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-label">Your Balance</span>
        <span class="confirm-value">₹${fmtINR(currentProfile.balance)}</span>
      </div>
      <div class="confirm-row">
        <span class="confirm-label">Balance After</span>
        <span class="confirm-value" style="color:var(--gold-400);">₹${fmtINR(currentProfile.balance - amount)}</span>
      </div>
      ${remark ? `<div class="confirm-row"><span class="confirm-label">Remark</span><span class="confirm-value">${remark}</span></div>` : ''}

      <div class="form-group" style="margin-top:20px;">
        <label class="form-label">Enter Your Password to Confirm</label>
        <div class="form-input-wrapper">
          <input class="form-input has-icon" id="confirm-password" type="password" placeholder="Your account password" />
          <span class="form-input-icon" onclick="togglePwd('confirm-password', this)">👁</span>
        </div>
      </div>

      <div id="confirm-error"></div>

      <button class="btn btn-primary" id="confirm-transfer-btn" onclick="executeTransfer(${amount}, '${remark}')">
        ✅ Confirm & Send ₹${fmtINR(amount)}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ===== EXECUTE TRANSFER =====
async function executeTransfer(amount, remark) {
  const password = document.getElementById('confirm-password').value;
  const errorEl = document.getElementById('confirm-error');

  if (!password) {
    errorEl.innerHTML = '<div class="alert alert-error">⚠️ Please enter your password.</div>';
    return;
  }

  setLoading('confirm-transfer-btn', true);

  try {
    // Re-authenticate to verify password
    const { error: authError } = await sb.auth.signInWithPassword({
      email: currentProfile.email,
      password
    });

    if (authError) {
      errorEl.innerHTML = '<div class="alert alert-error">❌ Incorrect password. Transfer cancelled.</div>';
      setLoading('confirm-transfer-btn', false, `✅ Confirm & Send ₹${fmtINR(amount)}`);
      return;
    }

    // Execute transfer via Supabase RPC
    const { data, error } = await sb.rpc('transfer_funds', {
      p_sender_id: currentProfile.id,
      p_receiver_id: recipientData.id,
      p_amount: amount,
      p_remark: remark || null,
      p_sender_name: `${currentProfile.first_name} ${currentProfile.last_name}`,
      p_receiver_name: `${recipientData.first_name} ${recipientData.last_name}`
    });

    if (error) {
      errorEl.innerHTML = `<div class="alert alert-error">❌ Transfer failed: ${error.message}</div>`;
      setLoading('confirm-transfer-btn', false, `✅ Confirm & Send ₹${fmtINR(amount)}`);
      return;
    }

    // Update local balance
    currentProfile.balance -= amount;

    // Close modal and reset form
    document.getElementById('confirm-modal')?.remove();

    toast(`✅ ₹${fmtINR(amount)} sent to ${recipientData.first_name} ${recipientData.last_name}!`, 'success');

    // Reset transfer form
    document.getElementById('transfer-recipient').value = '';
    document.getElementById('transfer-amount').value = '';
    document.getElementById('transfer-remark').value = '';
    document.getElementById('recipient-result').innerHTML = '';
    document.getElementById('amount-group').style.display = 'none';
    document.getElementById('remark-group').style.display = 'none';
    document.getElementById('proceed-btn').style.display = 'none';
    recipientData = null;

    // Reload data
    await loadProfile();
    await loadDashboardData();

    // Switch to home
    switchTab('home', null);

  } catch(e) {
    errorEl.innerHTML = '<div class="alert alert-error">❌ Unexpected error. Please try again.</div>';
    setLoading('confirm-transfer-btn', false, `✅ Confirm & Send ₹${fmtINR(amount)}`);
  }
}

// ===== LOGOUT =====
async function handleLogout() {
  try {
    await sb.auth.signOut();
  } catch(e) {
    console.error('Signout error:', e);
  }
  currentUser = null;
  currentProfile = null;
  allTransactions = [];
  recipientData = null;
  const loginId = document.getElementById('login-identifier');
  const loginPwd = document.getElementById('login-password');
  if (loginId) loginId.value = '';
  if (loginPwd) loginPwd.value = '';
  clearAlert('login-alert');
  showPage('login');
  toast('Signed out successfully.', 'info');
}

// ===== DASHBOARD EVENTS =====
function attachDashboardEvents() {
  const el = document.getElementById('transfer-recipient');
  if (el) {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') lookupRecipient(); });
  }
}
