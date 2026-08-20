import React, { useState, useEffect, useRef } from 'react';
import { 
  Dumbbell, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Sparkles, 
  Trash2
} from 'lucide-react';
import {
  login,
  signUp,
  signInWithGoogle,
  listSavedAccounts,
  deleteAccount,
  UserAccount
} from '../../core/auth/authService';

interface AuthScreenProps {
  onAuthenticated: (account: UserAccount) => void;
  initialError?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated, initialError }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI states
  const [savedAccounts, setSavedAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialError || null);

  // Conta escolhida na lista do dispositivo, aguardando a senha.
  const [pendingAccountId, setPendingAccountId] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const loadSaved = async () => {
    const list = await listSavedAccounts();
    setSavedAccounts(list);
    if (list.length === 0) {
      setMode('signup');
    }
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const account = await login(email, password);
      // A troca do contêiner fica a cargo do App (activateAccount), para não
      // fechar e reabrir a conexão duas vezes em sequência.
      onAuthenticated(account);
    } catch (err) {
      setErrorMsg((err instanceof Error && err.message) || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const account = await signUp(name, email, password);
      onAuthenticated(account);
    } catch (err) {
      setErrorMsg((err instanceof Error && err.message) || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithGoogle();
      // Em caso de sucesso o navegador é redirecionado. Se ele voltar para cá
      // (popup bloqueado, botão "voltar"), o finally destrava a interface.
    } catch (err) {
      setErrorMsg((err instanceof Error && err.message) || 'Erro ao iniciar autenticação com o Google.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Selecionar uma conta salva apenas pré-preenche o formulário: a senha
   * continua obrigatória. Entrar com um clique tornaria a senha decorativa
   * para qualquer pessoa com acesso ao aparelho.
   */
  const handleSelectSavedAccount = (acc: UserAccount) => {
    setErrorMsg(null);

    if (acc.provider === 'google') {
      setErrorMsg('Esta conta foi criada com o Google. Use o botão "Entrar com o Google".');
      return;
    }

    setMode('login');
    setEmail(acc.email);
    setPassword('');
    setPendingAccountId(acc.id);
    passwordInputRef.current?.focus();
  };

  const handleDeleteSavedAccount = async (e: React.MouseEvent, accId: string) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja apagar esta conta e todo o seu contêiner de dados do dispositivo?')) {
      await deleteAccount(accId);
      await loadSaved();
    }
  };

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-[#090F1E] border border-[#84CC16]/30 flex items-center justify-center mx-auto shadow-2xl shadow-lime-500/10 text-[#A3E635]">
            <Dumbbell className="w-8 h-8 stroke-[2.5]" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">
              Omni<span className="text-[#A3E635]">Fit</span>
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Nutrição de Precisão & Biomecânica Adaptativa
            </p>
          </div>
        </div>

        {/* Quick Profiles Switcher (If Accounts Exist on Device) */}
        {savedAccounts.length > 0 && (
          <div className="p-4 rounded-3xl bg-[#090F1E] border border-white/[0.08] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#A3E635]" />
                Contas no Dispositivo
              </span>
              <span className="text-[10px] font-mono text-[#A3E635] font-bold">
                {savedAccounts.length} {savedAccounts.length === 1 ? 'perfil' : 'perfis'}
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {savedAccounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => handleSelectSavedAccount(acc)}
                  className={`p-2.5 rounded-2xl bg-[#060A14] border transition-all flex items-center justify-between cursor-pointer group btn-tactile ${
                    pendingAccountId === acc.id
                      ? 'border-[#84CC16]/60 bg-[#84CC16]/[0.06]'
                      : 'border-white/[0.06] hover:border-[#84CC16]/50 hover:bg-[#060A14]/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#84CC16]/15 border border-[#84CC16]/30 text-[#A3E635] flex items-center justify-center font-bold text-xs font-mono shrink-0 uppercase">
                      {acc.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white group-hover:text-[#A3E635] transition-colors truncate">
                        {acc.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono truncate">
                        {acc.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-[#A3E635] opacity-0 group-hover:opacity-100 transition-opacity">
                      {acc.provider === 'google' ? 'Google' : 'Digitar senha →'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSavedAccount(e, acc.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Excluir perfil deste dispositivo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Auth Form Container */}
        <div className="p-6 rounded-3xl bg-[#090F1E] border border-white/[0.09] shadow-2xl space-y-4">
          {/* Segmented Mode Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#060A14] border border-white/[0.06] rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition-all text-center ${
                mode === 'login'
                  ? 'btn-lime text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar na Conta
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`py-2.5 rounded-xl text-xs font-extrabold transition-all text-center ${
                mode === 'signup'
                  ? 'btn-lime text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Nova Conta
            </button>
          </div>

          {/* Google OAuth Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#060A14] border border-white/[0.12] hover:border-[#84CC16]/40 text-white font-bold text-xs transition-all flex items-center justify-center gap-3 btn-tactile shadow-sm hover:bg-[#060A14]/80 disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
              />
            </svg>
            <span>Continuar com o Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              ou com e-mail
            </span>
            <div className="flex-1 h-[1px] bg-white/[0.08]" />
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 animate-in fade-in duration-150">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={mode === 'login' ? handleLogin : handleSignUp} className="space-y-3.5">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                  Seu Nome ou Apelido
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Murillo Ramos"
                    className="w-full pl-10 pr-4 py-3 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:border-[#84CC16] focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                Endereço de E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:border-[#84CC16] focus:outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider font-mono">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={passwordInputRef}
                  type="password"
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Mínimo de 8 caracteres' : 'Sua senha'}
                  className="w-full pl-10 pr-4 py-3 bg-[#060A14] border border-white/[0.08] rounded-2xl text-xs font-bold text-white placeholder-slate-600 focus:border-[#84CC16] focus:outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Privacy & Container Notice */}
            <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.04] flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <ShieldCheck className="w-4 h-4 text-[#A3E635] shrink-0" />
              <span>Seus dados ficam somente neste aparelho, em um contêiner separado por conta. A senha não é guardada: fica protegida por derivação de chave (PBKDF2).</span>
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl btn-lime text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-lime-500/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Conectando ao contêiner...</span>
              ) : mode === 'login' ? (
                <>
                  <span>Entrar no OmniFit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Conta & Iniciar Calibração</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
