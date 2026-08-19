import { describe, it, expect } from 'vitest';
import { hashPassword } from '../authService';

describe('Serviço de Autenticação & Hashing Criptográfico', () => {
  it('deve gerar hash SHA-256 consistente para a mesma senha', async () => {
    const pass1 = 'minhasenha123';
    const hash1 = await hashPassword(pass1);
    const hash2 = await hashPassword(pass1);

    expect(hash1).toBeDefined();
    expect(hash1.length).toBe(64); // 256 bits em hex = 64 chars
    expect(hash1).toBe(hash2);
  });

  it('deve gerar hashes distintos para senhas diferentes', async () => {
    const hashA = await hashPassword('senha_usuario_a');
    const hashB = await hashPassword('senha_usuario_b');

    expect(hashA).not.toBe(hashB);
  });
});
