// @vitest-environment jsdom
import '../../../test/componentSetup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthScreen } from '../AuthScreen';
import { authDb, signUp } from '../../../core/auth/authService';

/**
 * A tela de login tinha um furo grave: clicar numa conta salva autenticava sem
 * pedir senha, com nome e e-mail de todas as contas expostos na lista. A senha
 * era decorativa para qualquer pessoa com acesso ao aparelho.
 */

beforeEach(async () => {
  await authDb.accounts.clear();
  localStorage.clear();
});

describe('AuthScreen — contas salvas no dispositivo', () => {
  it('NÃO deve autenticar ao clicar numa conta salva', async () => {
    const user = userEvent.setup();
    await signUp('Fulano', 'fulano@teste.local', 'senhaSegura123');
    localStorage.clear(); // simula logout

    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    const cartao = await screen.findByText('fulano@teste.local');
    await user.click(cartao);

    // Selecionar a conta só prepara o formulário — a senha continua obrigatória.
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(localStorage.getItem('omnifit_active_user_id')).toBeNull();
  });

  it('deve pré-preencher o e-mail ao selecionar a conta', async () => {
    const user = userEvent.setup();
    await signUp('Fulano', 'fulano@teste.local', 'senhaSegura123');
    localStorage.clear();

    render(<AuthScreen onAuthenticated={vi.fn()} />);

    await user.click(await screen.findByText('fulano@teste.local'));

    const campoEmail = document.querySelector('input[type="email"]') as HTMLInputElement;
    await waitFor(() => expect(campoEmail.value).toBe('fulano@teste.local'));
  });
});

describe('AuthScreen — login com senha', () => {
  it('deve autenticar com a senha correta', async () => {
    const user = userEvent.setup();
    await signUp('Fulano', 'fulano@teste.local', 'senhaSegura123');
    localStorage.clear();

    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    await user.click(await screen.findByText('fulano@teste.local'));
    await user.type(document.querySelector('input[type="password"]')!, 'senhaSegura123');
    await user.click(screen.getByRole('button', { name: /Entrar no OmniFit/i }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
  });

  it('deve recusar a senha errada com mensagem genérica', async () => {
    const user = userEvent.setup();
    await signUp('Fulano', 'fulano@teste.local', 'senhaSegura123');
    localStorage.clear();

    const onAuthenticated = vi.fn();
    render(<AuthScreen onAuthenticated={onAuthenticated} />);

    await user.click(await screen.findByText('fulano@teste.local'));
    await user.type(document.querySelector('input[type="password"]')!, 'senhaErrada999');
    await user.click(screen.getByRole('button', { name: /Entrar no OmniFit/i }));

    // A mensagem não revela se o e-mail existe.
    expect(await screen.findByText(/E-mail ou senha incorretos/i)).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});

describe('AuthScreen — cadastro', () => {
  it('deve exigir senha de pelo menos 8 caracteres', async () => {
    const user = userEvent.setup();
    render(<AuthScreen onAuthenticated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /Criar Nova Conta/i }));

    await user.type(document.querySelector('input[type="text"]')!, 'Novo Usuario');
    await user.type(document.querySelector('input[type="email"]')!, 'novo@teste.local');
    await user.type(document.querySelector('input[type="password"]')!, 'curta');

    const form = document.querySelector('form') as HTMLFormElement;
    form.requestSubmit();

    expect(await screen.findByText(/pelo menos 8 caracteres/i)).toBeInTheDocument();
  });

  it('não deve permitir dois cadastros com o mesmo e-mail', async () => {
    const user = userEvent.setup();
    await signUp('Primeiro', 'repetido@teste.local', 'senhaSegura123');
    localStorage.clear();

    render(<AuthScreen onAuthenticated={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Criar Nova Conta/i }));

    await user.type(document.querySelector('input[type="text"]')!, 'Segundo');
    await user.type(document.querySelector('input[type="email"]')!, 'repetido@teste.local');
    await user.type(document.querySelector('input[type="password"]')!, 'outraSenha123');
    (document.querySelector('form') as HTMLFormElement).requestSubmit();

    expect(await screen.findByText(/Já existe uma conta/i)).toBeInTheDocument();
  });
});

describe('AuthScreen — texto de privacidade', () => {
  it('não deve afirmar que os dados estão criptografados', async () => {
    render(<AuthScreen onAuthenticated={vi.fn()} />);

    // O IndexedDB fica em texto claro: só o hash da senha usa criptografia.
    // Prometer criptografia dos dados era uma afirmação falsa de segurança.
    await waitFor(() => {
      expect(document.body.textContent).not.toMatch(/criptografad/i);
    });
  });
});
