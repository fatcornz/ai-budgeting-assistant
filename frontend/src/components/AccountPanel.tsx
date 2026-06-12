import { FormEvent, useEffect, useState } from 'react';
import { LogOut, Save, TrendingDown, TrendingUp, UserRound } from 'lucide-react';
import { createHistory, createProfile, fetchHistory, fetchProfiles, login, register, updateProfile } from '../lib/api';
import { clearSavedAuth, loadSavedAuth, saveAuth, type SavedAuthState } from '../lib/storage';
import {
  CATEGORY_LABELS,
  type BudgetCategory,
  type BudgetHistoryEntry,
  type BudgetInput,
  type BudgetProfile,
  type CategoryName
} from '../types/budget';

interface AccountPanelProps {
  budget: BudgetInput;
  onBudgetChange: (budget: BudgetInput) => void;
}

export function AccountPanel({ budget, onBudgetChange }: AccountPanelProps) {
  const [auth, setAuth] = useState<SavedAuthState | null>(() => loadSavedAuth());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profileName, setProfileName] = useState('My Budget');
  const [profiles, setProfiles] = useState<BudgetProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null);
  const [history, setHistory] = useState<BudgetHistoryEntry[]>([]);
  const [message, setMessage] = useState('');
  const isUsernameValid = username.trim().length >= 3;
  const isPasswordValid = password.length >= 8;
  const canSubmit = isUsernameValid && isPasswordValid;
  const categoryChanges = buildCategoryChanges(history);

  useEffect(() => {
    if (!auth) return;
    fetchProfiles(auth.token)
      .then((items) => {
        setProfiles(items);
        if (items[0] && activeProfileId === null) setActiveProfileId(items[0].id);
      })
      .catch(() => setMessage('Sign in again to load saved profiles.'));
  }, [activeProfileId, auth]);

  useEffect(() => {
    if (!auth || activeProfileId === null) return;
    fetchHistory(auth.token, activeProfileId).then(setHistory).catch(() => setHistory([]));
  }, [activeProfileId, auth]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>, mode: 'login' | 'register') => {
    event.preventDefault();
    await runAuth(mode);
  };

  const runAuth = async (mode: 'login' | 'register') => {
    if (!canSubmit) {
      setMessage('Use at least 3 characters for username and 8 characters for password.');
      return;
    }

    try {
      const result = mode === 'login' ? await login(username, password) : await register(username, password);
      saveAuth(result);
      setAuth(result);
      setMessage(`Signed in as ${result.username}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Account request failed.');
    }
  };

  const saveCurrentProfile = async () => {
    if (!auth) return;
    const saved = activeProfileId
      ? await updateProfile(auth.token, activeProfileId, profileName, budget)
      : await createProfile(auth.token, profileName, budget);
    setActiveProfileId(saved.id);
    setProfiles((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
    setMessage('Budget profile saved.');
  };

  const loadProfile = (profile: BudgetProfile) => {
    setActiveProfileId(profile.id);
    setProfileName(profile.name);
    onBudgetChange(profile.budget);
    setMessage(`Loaded ${profile.name}.`);
  };

  const snapshotMonth = async () => {
    if (!auth || activeProfileId === null) return;
    const month = new Date().toISOString().slice(0, 7);
    const entry = await createHistory(auth.token, activeProfileId, month, budget);
    setHistory((items) => [entry, ...items]);
    setMessage(`Saved ${month} history snapshot.`);
  };

  const signOut = () => {
    clearSavedAuth();
    setAuth(null);
    setProfiles([]);
    setHistory([]);
    setActiveProfileId(null);
    setMessage('Signed out.');
  };

  if (!auth) {
    return (
      <section className="panel account-panel section-anchor" id="account">
        <div className="section-title-row">
          <UserRound size={20} />
          <h2>Account</h2>
        </div>
        <p className="panel-note">Create a simple local account to save profiles and monthly snapshots.</p>
        <form className="account-form" onSubmit={(event) => submitAuth(event, 'login')}>
          <label>
            Username
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="3+ characters" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8+ characters"
              type="password"
            />
          </label>
          <div className="memory-actions">
            <button className="icon-label-button" type="submit" disabled={!canSubmit}>Log in</button>
            <button className="icon-label-button" type="button" onClick={() => runAuth('register')} disabled={!canSubmit}>
              Create account
            </button>
          </div>
        </form>
        {message && <p className="form-message">{message}</p>}
      </section>
    );
  }

  return (
    <section className="panel account-panel section-anchor" id="account">
      <div className="section-header compact">
        <div>
          <span className="eyebrow">Account</span>
          <h2>{auth.username}</h2>
        </div>
        <button className="icon-button neutral" type="button" aria-label="Sign out" onClick={signOut}>
          <LogOut size={16} />
        </button>
      </div>
      <div className="profile-save-row">
        <input value={profileName} onChange={(event) => setProfileName(event.target.value)} />
        <button className="icon-label-button" type="button" onClick={saveCurrentProfile}>
          <Save size={15} /> Save
        </button>
      </div>
      <div className="profile-list">
        {profiles.map((profile) => (
          <button type="button" key={profile.id} onClick={() => loadProfile(profile)}>
            {profile.name}
          </button>
        ))}
      </div>
      <button className="small-button" type="button" onClick={snapshotMonth} disabled={activeProfileId === null}>
        Save month snapshot
      </button>
      {history.length > 0 && (
        <div className="history-list">
          {history.slice(0, 4).map((entry) => (
            <span key={entry.id}>{entry.month}: score {entry.analysis.budget_score}</span>
          ))}
        </div>
      )}
      {categoryChanges.length > 0 && (
        <div className="category-change-panel">
          <div className="section-title-row">
            <TrendingUp size={18} />
            <h3>Category changes</h3>
          </div>
          {categoryChanges.map((month) => (
            <article className="change-month" key={`${month.previousMonth}-${month.month}`}>
              <strong>{month.month} vs {month.previousMonth}</strong>
              <div className="change-list">
                {month.changes.map((change) => (
                  <div className="category-change-row" key={`${month.month}-${change.name}`}>
                    <span>{CATEGORY_LABELS[change.name]}</span>
                    <strong className={change.delta > 0 ? 'up' : 'down'}>
                      {change.delta > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                      {formatSignedCurrency(change.delta)}
                    </strong>
                    <em className={change.delta > 0 ? 'up' : 'down'}>{formatPercentChange(change.percent)}</em>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {message && <p className="form-message">{message}</p>}
    </section>
  );
}

interface CategoryChangeMonth {
  month: string;
  previousMonth: string;
  changes: CategoryChange[];
}

interface CategoryChange {
  name: CategoryName;
  delta: number;
  percent: number | null;
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0
});

function buildCategoryChanges(history: BudgetHistoryEntry[]): CategoryChangeMonth[] {
  const monthlySnapshots = latestSnapshotByMonth(history);
  return monthlySnapshots
    .slice(1)
    .map((entry, index) => {
      const previous = monthlySnapshots[index];
      const currentTotals = mergeCategories(entry.budget.categories);
      const previousTotals = mergeCategories(previous.budget.categories);
      const categoryNames = Array.from(new Set([...Object.keys(currentTotals), ...Object.keys(previousTotals)])) as CategoryName[];
      const changes = categoryNames
        .map((name) => {
          const currentAmount = currentTotals[name] ?? 0;
          const previousAmount = previousTotals[name] ?? 0;
          const delta = roundCurrency(currentAmount - previousAmount);
          if (delta === 0) return null;
          return {
            name,
            delta,
            percent: previousAmount > 0 ? roundCurrency((delta / previousAmount) * 100) : null
          };
        })
        .filter((change): change is CategoryChange => change !== null)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

      return {
        month: entry.month,
        previousMonth: previous.month,
        changes
      };
    })
    .filter((month) => month.changes.length > 0)
    .slice(-3)
    .reverse();
}

function latestSnapshotByMonth(history: BudgetHistoryEntry[]) {
  const snapshots = new Map<string, BudgetHistoryEntry>();
  for (const entry of history) {
    if (!snapshots.has(entry.month)) {
      snapshots.set(entry.month, entry);
    }
  }
  return Array.from(snapshots.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function mergeCategories(categories: BudgetCategory[]): Record<string, number> {
  return categories.reduce<Record<string, number>>((totals, category) => {
    totals[category.name] = roundCurrency((totals[category.name] ?? 0) + category.amount);
    return totals;
  }, {});
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatSignedCurrency(value: number) {
  const formatted = currency.format(Math.abs(value));
  return `${value > 0 ? '+' : '-'}${formatted}`;
}

function formatPercentChange(value: number | null) {
  if (value === null) return 'New';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}
