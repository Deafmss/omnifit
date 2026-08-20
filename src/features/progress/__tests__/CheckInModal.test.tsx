// @vitest-environment jsdom
import '../../../test/componentSetup';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckInModal } from '../CheckInModal';
import { db, switchUserDb, logFoodConsumption } from '../../../core/storage/db';
import { calculateMetabolicStats } from '../../../core/math/metabolism';
import { UserProfile, WeightLog } from '../../../core/storage/types';
import { todayLocal, toLocalDateString, addDays } from '../../../core/utils/dateUtils';

/**
 * Check-in adaptativo — o recurso que dá nome à proposta do app e que era
 * inteiramente decorativo: o ajuste calórico sugerido nunca chegava ao alvo do
 * usuário, e a "adesão à dieta" era um slider que ele arrastava no chute.
 */

const perfil: UserProfile = {
  name: 'Teste',
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  bodyFatPercentage: 18,
  experienceLevel: 'intermediate',
  goal: 'fat_loss',
  trainingDaysPerWeek: 4,
  sessionDurationMin: 60,
  dietMode: 'guided',
  mealsPerDay: 4,
  isCalibrated: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const stats = calculateMetabolicStats(perfil);

/** 14 dias de peso praticamente estagnado. */
function pesagensEstagnadas(): WeightLog[] {
  return Array.from({ length: 15 }, (_, i) => {
    const dia = 14 - i;
    return {
      date: toLocalDateString(addDays(new Date(), -dia)),
      weightKg: 80 - i * 0.005,
      emaWeightKg: 80 - i * 0.005
    };
  });
}

beforeEach(async () => {
  switchUserDb(`checkin_${Math.random().toString(36).slice(2)}`);
  await db.profiles.add({ ...perfil });
});

const renderCheckIn = (weightLogs: WeightLog[], onRecalibrated = vi.fn()) =>
  render(
    <CheckInModal
      isOpen
      onClose={vi.fn()}
      profile={perfil}
      stats={stats}
      weightLogs={weightLogs}
      onRecalibrated={onRecalibrated}
    />
  );

describe('CheckInModal — janela de avaliação', () => {
  it('deve informar a janela real de dias, não a quantidade de registros', async () => {
    renderCheckIn(pesagensEstagnadas());

    // A versão anterior usava `weightLogs.length` como se fossem dias.
    expect(await screen.findByText(/14 dias/)).toBeInTheDocument();
  });

  it('deve avisar quando o histórico é curto demais', async () => {
    renderCheckIn([{ date: todayLocal(), weightKg: 80, emaWeightKg: 80 }]);

    expect(await screen.findByText(/a partir de 7 dias/i)).toBeInTheDocument();
  });
});

describe('CheckInModal — adesão medida', () => {
  it('deve exibir o slider manual quando não há diário alimentar', async () => {
    renderCheckIn(pesagensEstagnadas());

    expect(await screen.findByText(/Adesão à dieta na semana/i)).toBeInTheDocument();
    expect(document.querySelector('input[type="range"]')).toBeInTheDocument();
  });

  it('deve medir a adesão do diário e esconder o slider', async () => {
    // ~2000 kcal registradas: arroz tem 128 kcal/100 g.
    await logFoodConsumption(todayLocal(), 'Almoço', 1, 'arroz_branco_cozido', 1560);

    renderCheckIn(pesagensEstagnadas());

    expect(await screen.findByText(/Adesão medida/i)).toBeInTheDocument();
    // Com dado real, o chute do usuário sai de cena.
    await waitFor(() => {
      expect(document.querySelector('input[type="range"]')).not.toBeInTheDocument();
    });
    expect(screen.getByText(/dia registrado|dias registrados/)).toBeInTheDocument();
  });
});

describe('CheckInModal — aplicação do ajuste', () => {
  it('deve persistir o ajuste calórico no perfil', async () => {
    const user = userEvent.setup();
    const onRecalibrated = vi.fn();
    renderCheckIn(pesagensEstagnadas(), onRecalibrated);

    await screen.findByText(/14 dias/);

    await user.click(screen.getByRole('button', { name: /Avaliar Metabolismo Real/i }));

    // Peso estagnado em emagrecimento: o motor precisa sugerir corte.
    const aplicar = await screen.findByRole('button', { name: /Salvar e Aplicar|Salvar Check-in/i });
    await user.click(aplicar);

    await waitFor(async () => {
      const [salvo] = await db.profiles.toArray();
      // Era o bug central: o ajuste ia para o log do check-in e nunca chegava
      // ao alvo calórico. Agora fica no perfil e entra em calculateMetabolicStats.
      expect(salvo.calorieAdjustmentKcal).toBeLessThan(0);
    });

    expect(onRecalibrated).toHaveBeenCalled();
  });

  it('deve gravar o check-in no histórico', async () => {
    const user = userEvent.setup();
    renderCheckIn(pesagensEstagnadas());

    await screen.findByText(/14 dias/);
    await user.click(screen.getByRole('button', { name: /Avaliar Metabolismo Real/i }));
    await user.click(await screen.findByRole('button', { name: /Salvar e Aplicar|Salvar Check-in/i }));

    await waitFor(async () => expect(await db.checkInLogs.count()).toBe(1));

    const [log] = await db.checkInLogs.toArray();
    expect(log.date).toBe(todayLocal());
    expect(log.notes).toBeTruthy();
  });

  it('deve mostrar a nova meta usando o mesmo cálculo do app', async () => {
    const user = userEvent.setup();
    renderCheckIn(pesagensEstagnadas());

    await screen.findByText(/14 dias/);
    await user.click(screen.getByRole('button', { name: /Avaliar Metabolismo Real/i }));

    // A projeção passa pelo calculateMetabolicStats real, incluindo o piso da
    // TMB — antes prometia um número diferente do que valeria depois de salvar.
    expect(await screen.findByText(/Nova meta diária/i)).toBeInTheDocument();
  });
});
