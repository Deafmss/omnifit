import Dexie, { type EntityTable } from 'dexie';

export interface UserAccount {
  id: string; // Unique ID (e.g. email or generated uuid)
  name: string;
  email: string;
  passwordHash: string;
  avatarColor?: string;
  createdAt: string;
  lastLoginAt: string;
}

class OmniFitAuthDatabase extends Dexie {
  accounts!: EntityTable<UserAccount, 'id'>;

  constructor() {
    super('OmniFit_AuthDB');
    this.version(1).stores({
      accounts: 'id, email, name, createdAt'
    });
  }
}

export const authDb = new OmniFitAuthDatabase();

const ACTIVE_ACCOUNT_KEY = 'omnifit_active_user_id';

const AVATAR_COLORS = [
  'bg-lime-500 text-slate-950',
  'bg-emerald-500 text-slate-950',
  'bg-cyan-500 text-slate-950',
  'bg-blue-500 text-white',
  'bg-purple-500 text-white',
  'bg-amber-500 text-slate-950'
];

/**
 * Gera hash criptográfico seguro SHA-256 via Web Crypto API nativa do navegador.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cria uma nova conta e inicializa a sessão ativa.
 */
export async function signUp(name: string, email: string, password: string): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Por favor, digite seu nome completo ou apelido.');
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Por favor, informe um endereço de e-mail válido.');
  }

  if (!password || password.length < 4) {
    throw new Error('A senha deve ter pelo menos 4 caracteres.');
  }

  const existing = await authDb.accounts.where('email').equals(cleanEmail).first();
  if (existing) {
    throw new Error('Já existe uma conta cadastrada com este e-mail. Faça login ou use outro e-mail.');
  }

  const passwordHash = await hashPassword(password);
  const id = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const account: UserAccount = {
    id,
    name: cleanName,
    email: cleanEmail,
    passwordHash,
    avatarColor,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  await authDb.accounts.add(account);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);

  return account;
}

/**
 * Autentica o usuário com email e senha.
 */
export async function login(email: string, password: string): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Informe seu e-mail e senha.');
  }

  const account = await authDb.accounts.where('email').equals(cleanEmail).first();
  if (!account) {
    throw new Error('Conta não encontrada. Verifique o e-mail ou crie uma nova conta.');
  }

  const passwordHash = await hashPassword(password);
  if (account.passwordHash !== passwordHash) {
    throw new Error('Senha incorreta. Tente novamente.');
  }

  const now = new Date().toISOString();
  await authDb.accounts.update(account.id, { lastLoginAt: now });
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);

  return {
    ...account,
    lastLoginAt: now
  };
}

/**
 * Encerra a sessão ativa.
 */
export async function logout(): Promise<void> {
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
}

/**
 * Retorna a conta ativa atualmente, se houver.
 */
export async function getActiveAccount(): Promise<UserAccount | null> {
  const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (!activeId) return null;

  const account = await authDb.accounts.get(activeId);
  return account || null;
}

/**
 * Lista todas as contas salvas no dispositivo.
 */
export async function listSavedAccounts(): Promise<UserAccount[]> {
  return await authDb.accounts.toArray();
}

/**
 * Alterna para outra conta salva no dispositivo.
 */
export async function switchAccount(userId: string): Promise<UserAccount> {
  const account = await authDb.accounts.get(userId);
  if (!account) {
    throw new Error('Conta não encontrada no dispositivo.');
  }

  const now = new Date().toISOString();
  await authDb.accounts.update(account.id, { lastLoginAt: now });
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);

  return {
    ...account,
    lastLoginAt: now
  };
}

/**
 * Exclui uma conta e seu contêiner de banco de dados.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await authDb.accounts.delete(userId);
  const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (activeId === userId) {
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
  }

  // Deleta o banco IndexedDB do contêiner do usuário
  const dbName = `OmniFit_user_${userId}`;
  await Dexie.delete(dbName);
}
