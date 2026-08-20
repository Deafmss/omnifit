import { describe, it, expect } from 'vitest';
import { hashPassword } from '../authService';

describe('Serviço de Autenticação & Derivação de Chave (PBKDF2)', () => {
  it('deve gerar o mesmo hash para a mesma senha quando o salt é reutilizado', async () => {
    const first = await hashPassword('minhasenha123');
    const second = await hashPassword('minhasenha123', first.salt);

    expect(first.hash).toHaveLength(64); // 256 bits em hex
    expect(first.salt).toHaveLength(32); // 16 bytes em hex
    expect(second.hash).toBe(first.hash);
  });

  it('deve gerar hashes distintos para a mesma senha com salts diferentes', async () => {
    const a = await hashPassword('senha_identica');
    const b = await hashPassword('senha_identica');

    // Salt aleatório por conta: duas contas com a mesma senha não compartilham hash,
    // o que inviabiliza rainbow tables.
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it('deve gerar hashes distintos para senhas diferentes com o mesmo salt', async () => {
    const base = await hashPassword('senha_usuario_a');
    const other = await hashPassword('senha_usuario_b', base.salt);

    expect(other.hash).not.toBe(base.hash);
  });
});
