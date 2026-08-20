import Dexie, { type EntityTable } from 'dexie';
import { supabase } from '../supabase/supabaseClient';

export interface UserAccount {
  id: string; // Unique ID (e.g. email or generated uuid)
  name: string;
  email: string;
  passwordHash: string;
  /** Salt aleatório em hex. Ausente em contas legadas (SHA-256 puro). */
  passwordSalt?: string;
  /** Algoritmo usado. 'pbkdf2' para contas novas, 'sha256-legacy' para antigas. */
  passwordAlgo?: 'pbkdf2' | 'sha256-legacy' | 'oauth';
  /** Provedor de identidade. 'local' = e-mail e senha, 'google' = OAuth. */
  provider?: 'local' | 'google';
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

/** Contas OAuth não têm senha verificável localmente. */
const OAUTH_SENTINEL = 'oauth_no_local_password';

const PBKDF2_ITERATIONS = 210_000;

const AVATAR_COLORS = [
  'bg-lime-500 text-slate-950',
  'bg-emerald-500 text-slate-950',
  'bg-cyan-500 text-slate-950',
  'bg-blue-500 text-white',
  'bg-purple-500 text-white',
  'bg-amber-500 text-slate-950'
];

function toHex(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Converte um salt em hex de volta para bytes.
 * Retorna null para qualquer entrada malformada — um salt corrompido precisa
 * falhar de forma visível, não gerar silenciosamente uma chave diferente.
 */
function saltFromHex(saltHex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]+$/i.test(saltHex) || saltHex.length % 2 !== 0) return null;

  const pairs = saltHex.match(/.{2}/g);
  if (!pairs) return null;

  return Uint8Array.from(pairs.map((byte) => parseInt(byte, 16)));
}

function assertCryptoAvailable(): void {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Seu navegador bloqueou os recursos de criptografia. Acesse o OmniFit por HTTPS (ou localhost) para poder entrar.'
    );
  }
}

/**
 * Hash legado (SHA-256 sem salt), mantido apenas para validar contas antigas.
 * Nunca use para criar credenciais novas.
 */
async function hashPasswordLegacy(password: string): Promise<string> {
  assertCryptoAvailable();
  const data = new TextEncoder().encode(password.trim());
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

/**
 * Deriva a chave da senha com PBKDF2-SHA256 e salt aleatório.
 * PBKDF2 é lento por construção, o que torna força bruta e rainbow tables
 * inviáveis — ao contrário de um SHA-256 puro.
 */
export async function hashPassword(
  password: string,
  saltHex?: string
): Promise<{ hash: string; salt: string }> {
  assertCryptoAvailable();

  let salt: Uint8Array<ArrayBuffer>;
  if (saltHex) {
    const parsed = saltFromHex(saltHex);
    if (!parsed) {
      throw new Error('Não foi possível verificar sua senha: os dados de segurança da conta estão corrompidos.');
    }
    salt = parsed;
  } else {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    // O trim é mantido por compatibilidade: as contas criadas com o hash
    // legado também aparavam a senha, e mudar isso invalidaria os logins delas.
    new TextEncoder().encode(password.trim()),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  return { hash: toHex(bits), salt: toHex(salt) };
}

/**
 * Comparação em tempo constante, para não vazar informação pelo tempo de resposta.
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function validateEmail(email: string): void {
  // Validação simples e suficiente: algo@algo.tld
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error('Por favor, informe um endereço de e-mail válido.');
  }
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

  validateEmail(cleanEmail);

  if (!password || password.length < 8) {
    throw new Error('A senha deve ter pelo menos 8 caracteres.');
  }

  const { hash, salt } = await hashPassword(password);
  const id = `usr_${cleanEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const now = new Date().toISOString();

  const account: UserAccount = {
    id,
    name: cleanName,
    email: cleanEmail,
    passwordHash: hash,
    passwordSalt: salt,
    passwordAlgo: 'pbkdf2',
    provider: 'local',
    avatarColor,
    createdAt: now,
    lastLoginAt: now
  };

  // A checagem de duplicidade e a inserção precisam ser atômicas, senão dois
  // cadastros simultâneos do mesmo e-mail passariam os dois.
  await authDb.transaction('rw', authDb.accounts, async () => {
    const existing = await authDb.accounts.where('email').equals(cleanEmail).first();
    if (existing) {
      throw new Error('Já existe uma conta cadastrada com este e-mail. Faça login ou use outro e-mail.');
    }
    await authDb.accounts.add(account);
  });

  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
  return account;
}

/**
 * Autentica o usuário com e-mail e senha.
 * Contas antigas (SHA-256 sem salt) são migradas para PBKDF2 no primeiro login bem-sucedido.
 */
export async function login(email: string, password: string): Promise<UserAccount> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Informe seu e-mail e senha.');
  }

  const account = await authDb.accounts.where('email').equals(cleanEmail).first();
  if (!account) {
    throw new Error('E-mail ou senha incorretos.');
  }

  if (account.provider === 'google' || account.passwordAlgo === 'oauth') {
    throw new Error('Esta conta foi criada com o Google. Use o botão "Entrar com o Google".');
  }

  const isLegacy = !account.passwordSalt;
  let authenticated: boolean;

  if (isLegacy) {
    authenticated = safeEqual(account.passwordHash, await hashPasswordLegacy(password));
  } else {
    const { hash } = await hashPassword(password, account.passwordSalt);
    authenticated = safeEqual(account.passwordHash, hash);
  }

  if (!authenticated) {
    // Mensagem genérica de propósito: não revela se o e-mail existe.
    throw new Error('E-mail ou senha incorretos.');
  }

  const now = new Date().toISOString();
  const patch: Partial<UserAccount> = { lastLoginAt: now };

  if (isLegacy) {
    // Migração transparente para PBKDF2 agora que temos a senha em mãos.
    const upgraded = await hashPassword(password);
    patch.passwordHash = upgraded.hash;
    patch.passwordSalt = upgraded.salt;
    patch.passwordAlgo = 'pbkdf2';
    patch.provider = account.provider || 'local';
  }

  await authDb.accounts.update(account.id, patch);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);

  return { ...account, ...patch };
}

/**
 * Encerra a sessão ativa, tanto a local quanto a do Supabase (Google).
 */
export async function logout(): Promise<void> {
  localStorage.removeItem(ACTIVE_ACCOUNT_KEY);

  // Sem isto, a sessão OAuth continua válida e o usuário é reconectado
  // automaticamente no próximo carregamento da página.
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Não foi possível encerrar a sessão na nuvem:', err);
    }
  }
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
 * Exclui uma conta e seu contêiner de banco de dados.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const account = await authDb.accounts.get(userId);

  await authDb.accounts.delete(userId);

  const activeId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  if (activeId === userId) {
    localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    // Se era uma conta Google, encerra também a sessão na nuvem para que o
    // app não a restaure sozinho no próximo carregamento.
    if (supabase && (account?.provider === 'google' || userId.startsWith('usr_g_'))) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Não foi possível encerrar a sessão na nuvem:', err);
      }
    }
  }

  // Deleta o banco IndexedDB do contêiner do usuário
  await Dexie.delete(`OmniFit_user_${userId}`);
}

/**
 * Inicia o fluxo de autenticação com o Google via Supabase OAuth.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) {
    throw new Error(
      'O login com Google não está disponível: as chaves do Supabase não foram configuradas neste ambiente.'
    );
  }

  // Volta sempre para a origem atual. Fixar a URL de produção aqui impediria
  // testar o fluxo em localhost e jogaria o desenvolvedor no app publicado.
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });

  if (error) {
    throw new Error(error.message || 'Erro ao conectar com o Google.');
  }
}

/**
 * Processa a sessão de retorno do OAuth (Google) e sincroniza a conta localmente.
 * Reaproveita a conta local que já use o mesmo e-mail, para não criar um
 * contêiner de dados novo e vazio para quem já usava o app com senha.
 */
export async function processOAuthUser(user: {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string };
}): Promise<UserAccount> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    cleanEmail.split('@')[0] ||
    'Usuário Google';
  const oauthId = `usr_g_${user.id}`;
  const now = new Date().toISOString();

  const byOauthId = await authDb.accounts.get(oauthId);
  if (byOauthId) {
    await authDb.accounts.update(oauthId, { lastLoginAt: now, name });
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, oauthId);
    return { ...byOauthId, name, lastLoginAt: now };
  }

  // Já existe uma conta local com este e-mail? Vincula o Google a ela em vez
  // de criar uma segunda conta — assim a dieta e os treinos continuam lá.
  if (cleanEmail) {
    const byEmail = await authDb.accounts.where('email').equals(cleanEmail).first();
    if (byEmail) {
      await authDb.accounts.update(byEmail.id, { lastLoginAt: now, name });
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, byEmail.id);
      return { ...byEmail, name, lastLoginAt: now };
    }
  }

  const account: UserAccount = {
    id: oauthId,
    name,
    email: cleanEmail,
    passwordHash: OAUTH_SENTINEL,
    passwordAlgo: 'oauth',
    provider: 'google',
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    createdAt: now,
    lastLoginAt: now
  };

  await authDb.accounts.add(account);
  localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);

  return account;
}
