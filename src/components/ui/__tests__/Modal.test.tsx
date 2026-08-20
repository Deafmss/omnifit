// @vitest-environment jsdom
import '../../../test/componentSetup';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Modal } from '../Modal';

/**
 * O Modal concentrava três defeitos de acessibilidade e um de estado:
 * sem Escape, sem foco preso, sem `role="dialog"`, e o cleanup destravava o
 * scroll do body mesmo com outro modal ainda aberto (modais aninhados).
 */

describe('Modal — acessibilidade', () => {
  it('deve expor role e rótulo para leitores de tela', () => {
    render(
      <Modal isOpen onClose={() => {}} title="Título do Modal">
        <p>conteúdo</p>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // O rótulo aponta para o título real, não para um texto genérico.
    expect(dialog).toHaveAccessibleName('Título do Modal');
  });

  it('deve fechar com a tecla Escape', async () => {
    const user = userEvent.setup();
    let fechou = false;

    render(
      <Modal isOpen onClose={() => { fechou = true; }} title="Fechável">
        <p>conteúdo</p>
      </Modal>
    );

    await user.keyboard('{Escape}');
    expect(fechou).toBe(true);
  });

  it('deve fechar ao clicar fora, mas não ao clicar dentro', async () => {
    const user = userEvent.setup();
    let cliques = 0;

    render(
      <Modal isOpen onClose={() => { cliques += 1; }} title="Teste">
        <button type="button">Botão interno</button>
      </Modal>
    );

    await user.click(screen.getByText('Botão interno'));
    expect(cliques).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(cliques).toBe(1);
  });

  it('deve manter o foco dentro do painel ao tabular', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen onClose={() => {}} title="Foco">
        <button type="button">Primeiro</button>
        <button type="button">Último</button>
      </Modal>
    );

    const ultimo = screen.getByText('Último');
    ultimo.focus();
    await user.tab();

    // O foco circula para dentro do modal, não escapa para a página atrás.
    const painel = screen.getByRole('dialog');
    expect(painel.contains(document.activeElement)).toBe(true);
  });

  it('não deve renderizar nada quando fechado', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Invisível">
        <p>conteúdo</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument();
  });
});

describe('Modal — travamento do scroll', () => {
  it('deve travar ao abrir e liberar ao fechar', async () => {
    const user = userEvent.setup();

    const Wrapper = () => {
      const [aberto, setAberto] = useState(true);
      return (
        <Modal isOpen={aberto} onClose={() => setAberto(false)} title="Scroll">
          <p>conteúdo</p>
        </Modal>
      );
    };

    render(<Wrapper />);
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });

  it('deve manter o scroll travado quando um modal aninhado fecha', async () => {
    const user = userEvent.setup();

    const Aninhados = () => {
      const [internoAberto, setInternoAberto] = useState(true);
      return (
        <Modal isOpen onClose={() => {}} title="Externo">
          <p>externo</p>
          <Modal isOpen={internoAberto} onClose={() => setInternoAberto(false)} title="Interno">
            <button type="button" onClick={() => setInternoAberto(false)}>
              Fechar interno
            </button>
          </Modal>
        </Modal>
      );
    };

    render(<Aninhados />);
    expect(document.body.style.overflow).toBe('hidden');

    await user.click(screen.getByText('Fechar interno'));

    // O externo continua aberto: liberar o scroll aqui era o bug — a página
    // atrás voltava a rolar com o modal ainda na tela.
    await waitFor(() => expect(screen.queryByText('Fechar interno')).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe('hidden');
  });
});
