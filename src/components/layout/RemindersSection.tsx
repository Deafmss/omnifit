import React, { useState } from 'react';
import { Bell, BellOff, Droplets, UtensilsCrossed, Dumbbell, AlertCircle } from 'lucide-react';
import {
  ReminderSettings,
  notificationPermission,
  requestNotificationPermission
} from '../../core/services/reminders';

interface RemindersSectionProps {
  settings: ReminderSettings | null;
  onSave: (next: ReminderSettings) => Promise<void>;
}

const INTERVALOS = [60, 90, 120, 180];

/**
 * Ajustes de lembretes.
 *
 * O texto é explícito sobre a limitação real: sem servidor de push, o aviso só
 * sai com o app aberto. Prometer notificação com o app fechado seria mentira.
 */
export const RemindersSection: React.FC<RemindersSectionProps> = ({ settings, onSave }) => {
  const [permissao, setPermissao] = useState(notificationPermission());

  if (!settings) return null;

  const pedirPermissao = async () => {
    const resultado = await requestNotificationPermission();
    setPermissao(resultado);
  };

  const alternar = (campo: 'waterEnabled' | 'mealsEnabled' | 'workoutEnabled') => {
    onSave({ ...settings, [campo]: !settings[campo] });
  };

  if (permissao === 'unsupported') {
    return (
      <div className="space-y-2">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
          <BellOff className="w-3.5 h-3.5" />
          Lembretes
        </h3>
        <p className="text-[11px] font-mono text-slate-400 leading-snug">
          Este navegador não suporta notificações.
        </p>
      </div>
    );
  }

  const linhas: Array<{
    campo: 'waterEnabled' | 'mealsEnabled' | 'workoutEnabled';
    label: string;
    detalhe: string;
    Icon: typeof Droplets;
  }> = [
    {
      campo: 'waterEnabled',
      label: 'Água',
      detalhe: `A cada ${settings.waterIntervalMin} min, das ${settings.waterStartHour}h às ${settings.waterEndHour}h`,
      Icon: Droplets
    },
    {
      campo: 'mealsEnabled',
      label: 'Refeições',
      detalhe: 'No horário de cada refeição do seu plano',
      Icon: UtensilsCrossed
    },
    {
      campo: 'workoutEnabled',
      label: 'Treino',
      detalhe: `Às ${settings.workoutTime}, nos dias com treino no plano`,
      Icon: Dumbbell
    }
  ];

  return (
    <div className="space-y-2.5">
      <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
        <Bell className="w-3.5 h-3.5" />
        Lembretes
      </h3>

      {permissao !== 'granted' && (
        <div className="p-3 rounded-2xl bg-[#060A14] border border-white/[0.08] space-y-2">
          {permissao === 'denied' ? (
            <p className="text-[11px] font-mono text-slate-300 leading-snug flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                As notificações estão bloqueadas para este site. Libere nas permissões do
                navegador para ativar os lembretes.
              </span>
            </p>
          ) : (
            <>
              <p className="text-[11px] font-mono text-slate-300 leading-snug">
                Para receber lembretes é preciso autorizar as notificações.
              </p>
              <button
                type="button"
                onClick={pedirPermissao}
                className="w-full py-2 rounded-xl btn-lime text-slate-950 font-black text-[11px] btn-tactile"
              >
                Autorizar notificações
              </button>
            </>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        {linhas.map(({ campo, label, detalhe, Icon }) => (
          <button
            key={campo}
            type="button"
            onClick={() => alternar(campo)}
            aria-pressed={settings[campo]}
            aria-label={`Lembrete de ${label}`}
            className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-colors btn-tactile ${
              settings[campo]
                ? 'bg-[#84CC16]/10 border-[#84CC16]/30'
                : 'bg-[#060A14] border-white/[0.08]'
            }`}
          >
            <Icon
              className={`w-4 h-4 shrink-0 ${settings[campo] ? 'text-[#A3E635]' : 'text-slate-500'}`}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white">{label}</div>
              <div className="text-[10px] font-mono text-slate-400 truncate">{detalhe}</div>
            </div>
            <div
              className={`w-9 h-5 rounded-full shrink-0 relative transition-colors ${
                settings[campo] ? 'bg-[#84CC16]' : 'bg-white/10'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${
                  settings[campo] ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </div>
          </button>
        ))}
      </div>

      {settings.waterEnabled && (
        <div className="space-y-1.5 p-3 rounded-2xl bg-[#060A14] border border-white/[0.08]">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Intervalo dos lembretes de água
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {INTERVALOS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => onSave({ ...settings, waterIntervalMin: min })}
                className={`py-1.5 rounded-xl text-[11px] font-bold transition-colors btn-tactile ${
                  settings.waterIntervalMin === min
                    ? 'btn-lime text-slate-950 font-black'
                    : 'bg-white/[0.03] text-slate-400 border border-white/5'
                }`}
              >
                {min < 120 ? `${min}min` : `${min / 60}h`}
              </button>
            ))}
          </div>
        </div>
      )}

      {settings.workoutEnabled && (
        <div className="space-y-1.5 p-3 rounded-2xl bg-[#060A14] border border-white/[0.08]">
          <label
            htmlFor="horario-treino"
            className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block"
          >
            Horário do lembrete de treino
          </label>
          <input
            id="horario-treino"
            type="time"
            value={settings.workoutTime}
            onChange={(e) => onSave({ ...settings, workoutTime: e.target.value })}
            className="w-full px-3 py-2 bg-[#050811] border border-white/[0.08] rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[#84CC16]"
          />
        </div>
      )}

      <p className="text-[10px] font-mono text-slate-500 leading-snug">
        Os avisos saem enquanto o OmniFit estiver aberto — inclusive em segundo plano no celular
        com o app instalado. Notificação com o app totalmente fechado precisaria de um servidor de
        push, que o modo local-first não usa.
      </p>
    </div>
  );
};
