// @vitest-environment jsdom
import '../../../test/componentSetup';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DietOverview } from '../DietOverview';
import { db, switchUserDb } from '../../../core/storage/db';
import { calculateMetabolicStats } from '../../../core/math/metabolism';
import { UserProfile, MealPlan } from '../../../core/storage/types';
import { todayLocal, toLocalDateString, addDays } from '../../../core/utils/dateUtils';

/**
 * Testes da tela de dieta — a que concentra os bugs mais custosos do app:
 * virada do dia, registro no diário alimentar e os indicadores de balanço.
 */

const perfil: UserProfile = {
  name: 'Teste',
  age: 30,
  gender: 'male',
  heightCm: 180,
  weightKg: 80,
  bodyFatPercentage: 18,
  experienceLevel: 'intermediate',
  goal: 'recomposition',
  trainingDaysPerWeek: 4,
  sessionDurationMin: 60,
  dietMode: 'guided',
  mealsPerDay: 2,
  isCalibrated: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const stats = calculateMetabolicStats(perfil);

function refeicao(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    name: 'Café da Manhã',
    order: 1,
    timeLabel: '08:00',
    targetCalories: 500,
    targetProtein: 40,
    targetCarbs: 50,
    targetFat: 15,
    portions: [
      { foodId: 'ovo_galinha_cozido', grams: 100, consumed: false },
      { foodId: 'aveia_flocos', grams: 40, consumed: false }
    ],
    ...overrides
  };
}

async function semearBanco(plans: MealPlan[]) {
  switchUserDb(`ui_${Math.random().toString(36).slice(2)}`);
  await db.profiles.add({ ...perfil });
  await db.mealPlans.bulkAdd(plans);
}

const renderTela = () => render(<DietOverview profile={perfil} stats={stats} />);

describe('DietOverview — carregamento', () => {
  beforeEach(async () => {
    await semearBanco([refeicao()]);
  });

  it('deve exibir as refeições do banco', async () => {
    renderTela();
    expect(await screen.findByText('Café da Manhã')).toBeInTheDocument();
  });

  it('deve começar com a água em zero, e não com um valor fictício', async () => {
    renderTela();
    // O app abria afirmando 1,5 L consumidos sem o usuário ter registrado nada.
    expect(await screen.findByText(/0\.0\/.*L/)).toBeInTheDocument();
  });
});

describe('DietOverview — diário alimentar', () => {
  beforeEach(async () => {
    await semearBanco([refeicao()]);
  });

  it('deve gravar no diário ao marcar um alimento como consumido', async () => {
    const user = userEvent.setup();
    renderTela();

    await screen.findByText('Café da Manhã');

    // Marca a primeira porção pelo rótulo acessível.
    const marcar = await screen.findByRole('button', { name: /Marcar Ovo.*consumido/i });
    await user.click(marcar);

    await waitFor(async () => {
      const logs = await db.foodLogs.where('date').equals(todayLocal()).toArray();
      expect(logs).toHaveLength(1);
    });

    const logs = await db.foodLogs.toArray();
    expect(logs[0].foodId).toBe('ovo_galinha_cozido');
    expect(logs[0].calories).toBeGreaterThan(0);
    // Snapshot: o histórico não pode depender do alimento continuar existindo.
    expect(logs[0].foodName).toBeTruthy();
    expect(logs[0].mealName).toBe('Café da Manhã');
  });

  it('deve remover do diário ao desmarcar', async () => {
    const user = userEvent.setup();
    renderTela();
    await screen.findByText('Café da Manhã');

    const marcar = await screen.findByRole('button', { name: /Marcar Ovo.*consumido/i });
    await user.click(marcar);
    await waitFor(async () => expect(await db.foodLogs.count()).toBe(1));

    const desmarcar = await screen.findByRole('button', { name: /Desmarcar Ovo.*consumido/i });
    await user.click(desmarcar);
    await waitFor(async () => expect(await db.foodLogs.count()).toBe(0));
  });
});

describe('DietOverview — virada do dia', () => {
  it('deve zerar as marcações quando o último uso foi em outro dia', async () => {
    switchUserDb(`rollover_${Math.random().toString(36).slice(2)}`);
    await db.profiles.add({ ...perfil });
    await db.mealPlans.add(
      refeicao({
        portions: [{ foodId: 'ovo_galinha_cozido', grams: 100, consumed: true }]
      })
    );
    await db.appMeta.put({ key: 'lastActiveDate', value: toLocalDateString(addDays(new Date(), -1)) });

    renderTela();

    // Era o bug mais custoso do app: no dia seguinte a tela afirmava que o
    // usuário já havia comido tudo, e ele precisava zerar à mão todo dia.
    await waitFor(async () => {
      const plans = await db.mealPlans.toArray();
      expect(plans[0].portions.every((p) => !p.consumed)).toBe(true);
    });
  });

  it('deve preservar as marcações dentro do mesmo dia', async () => {
    switchUserDb(`same_${Math.random().toString(36).slice(2)}`);
    await db.profiles.add({ ...perfil });
    await db.mealPlans.add(
      refeicao({
        portions: [{ foodId: 'ovo_galinha_cozido', grams: 100, consumed: true }]
      })
    );
    await db.appMeta.put({ key: 'lastActiveDate', value: todayLocal() });

    renderTela();
    await screen.findByText('Café da Manhã');

    const plans = await db.mealPlans.toArray();
    expect(plans[0].portions[0].consumed).toBe(true);
  });
});

describe('DietOverview — indicadores de balanço', () => {
  beforeEach(async () => {
    await semearBanco([refeicao()]);
  });

  it('deve mostrar a meta do dia fixa e o balanço atual', async () => {
    renderTela();

    // Dois números distintos: a estratégia (fixa) e o acumulado (dinâmico).
    expect(await screen.findByText(/Meta do dia:/)).toBeInTheDocument();
    expect(screen.getByText(/Agora:/)).toBeInTheDocument();
  });

  it('o balanço "Agora" deve diminuir conforme o consumo é registrado', async () => {
    const user = userEvent.setup();
    renderTela();
    await screen.findByText('Café da Manhã');

    const lerAgora = () => {
      const texto = document.body.textContent || '';
      const match = texto.match(/Agora:\s*-?([\d.]+)/);
      return match ? Number(match[1].replace('.', '')) : NaN;
    };

    const antes = lerAgora();
    expect(Number.isNaN(antes)).toBe(false);

    const marcar = await screen.findByRole('button', { name: /Marcar Ovo.*consumido/i });
    await user.click(marcar);

    await waitFor(() => {
      const depois = lerAgora();
      expect(depois).toBeLessThan(antes);
    });
  });

  it('NÃO deve somar a queima estimada de estimulantes à meta calórica', async () => {
    const user = userEvent.setup();
    renderTela();
    await screen.findByText('Café da Manhã');

    const metaAntes = (document.body.textContent || '').match(/\/(\d+) kcal/)?.[1];

    // Adiciona um café: a queima estimada aparece, mas o alvo não muda.
    const botoesMais = [...document.querySelectorAll('button')].filter(
      (b) => b.textContent?.trim() === '+'
    );
    if (botoesMais[0]) {
      await user.click(botoesMais[0]);
      await waitFor(() => {
        const metaDepois = (document.body.textContent || '').match(/\/(\d+) kcal/)?.[1];
        expect(metaDepois).toBe(metaAntes);
      });
    }
  });
});

describe('DietOverview — água', () => {
  beforeEach(async () => {
    await semearBanco([refeicao()]);
  });

  it('deve persistir o consumo de água no banco', async () => {
    const user = userEvent.setup();
    renderTela();
    await screen.findByText('Café da Manhã');

    const botao250 = screen.getByText('+250ml');
    await user.click(botao250);

    await waitFor(async () => {
      const log = await db.thermogenicLogs.where('date').equals(todayLocal()).first();
      expect(log?.waterMl).toBe(250);
    });
  });
});
