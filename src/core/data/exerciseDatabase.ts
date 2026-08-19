import { Exercise } from '../storage/types';

export const EXERCISE_DATABASE: Exercise[] = [
  // ================= PEITORAL =================
  {
    id: 'supino_reto_barra',
    name: 'Supino Reto com Barra',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    mets: 6.0,
    minReps: 6,
    maxReps: 10,
    defaultRestSeconds: 120,
    instructions: 'Deite-se no banco, pegada um pouco mais larga que os ombros, pés firmes no chão. Desça a barra controladamente até o terço inferior do peito e empurre até a extensão quase completa dos cotovelos.'
  },
  {
    id: 'supino_inclinado_halteres',
    name: 'Supino Inclinado com Halteres (30º)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'compound',
    mets: 5.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Banco inclinado a 30º. Desça os halteres alinhando com a linha superior do peitoral, abrindo os cotovelos a cerca de 45º do tronco.'
  },
  {
    id: 'crucifixo_cabo_polia',
    name: 'Crucifixo / Crossover na Polia Média',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'cable',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Mantenha leve flexão nos cotovelos e contraia o peitoral ao fechar os braços à frente do corpo, sustentando 1 segundo no pico de contração.'
  },

  // ================= COSTAS / DORSAIS =================
  {
    id: 'puxada_alta_frente',
    name: 'Puxada Alta Frontal na Polia',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    category: 'cable',
    mets: 5.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Pegada aberta e pronada. Puxe a barra em direção à parte superior do peito, deprimindo as escápulas antes de flexionar os cotovelos.'
  },
  {
    id: 'remada_curvada_barra',
    name: 'Remada Curvada com Barra',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'hamstrings'],
    category: 'compound',
    mets: 6.5,
    minReps: 6,
    maxReps: 10,
    defaultRestSeconds: 120,
    instructions: 'Tronco inclinado a 45º, coluna neutra. Puxe a barra em direção ao umbigo, comprimindo as escápulas no topo do movimento.'
  },
  {
    id: 'remada_unilateral_serrote',
    name: 'Remada Unilateral com Halter (Serrote)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    category: 'compound',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 60,
    instructions: 'Apoie um joelho e mão no banco. Puxe o halter em direção ao quadril, mantendo o cotovelo próximo ao corpo.'
  },

  // ================= QUADRÍCEPS =================
  {
    id: 'agachamento_livre_barra',
    name: 'Agachamento Livre com Barra',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings', 'abs'],
    category: 'compound',
    mets: 7.0,
    minReps: 6,
    maxReps: 10,
    defaultRestSeconds: 150,
    instructions: 'Pés na largura dos ombros, pontas levemente para fora. Desça flexionando quadril e joelhos simultaneamente até que as coxas fiquem pelo menos paralelas ao chão.'
  },
  {
    id: 'leg_press_45',
    name: 'Leg Press 45º',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes'],
    category: 'machine',
    mets: 6.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 120,
    instructions: 'Pés no meio da plataforma na largura dos ombros. Desça até 90º nos joelhos sem arredondar a lombar da almofada.'
  },
  {
    id: 'cadeira_extensora',
    name: 'Cadeira Extensora',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Ajuste o apoio nos tornozelos. Estenda os joelhos até a contração máxima do quadríceps e controle a descida.'
  },

  // ================= POSTERIORES & GLÚTEOS =================
  {
    id: 'stiff_barra',
    name: 'Stiff com Barra / Halteres',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes'],
    category: 'compound',
    mets: 6.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Joelhos semi-flexionados fixos. Projete o quadril para trás enquanto desce o tronco com as costas retas até sentir o alongamento nos posteriores.'
  },
  {
    id: 'mesa_flexora',
    name: 'Mesa Flexora Deitada',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves'],
    category: 'machine',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Deitado de bruços, flexione as pernas trazendo o apoio em direção aos glúteos sem levantar a pelve do banco.'
  },
  {
    id: 'elevacao_pelvica_barra',
    name: 'Elevação Pélvica com Barra',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings'],
    category: 'compound',
    mets: 6.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Escápulas apoiadas no banco, barra sobre o quadril com almofada. Empurre com os calcanhares até o quadril alinhar com o tronco e contraia os glúteos no topo.'
  },

  // ================= OMBROS / DELTOIDES =================
  {
    id: 'desenvolvimento_halteres',
    name: 'Desenvolvimento com Halteres Sentado',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'compound',
    mets: 5.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Sentado com banco a 85º. Empurre os halteres verticalmente acima da cabeça até quase estender os braços, descendo até a altura das orelhas.'
  },
  {
    id: 'elevacao_lateral_halteres',
    name: 'Elevação Lateral com Halteres',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.0,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Eleve os halteres lateralmente com leve inclinação do dedinho para cima até a altura dos ombros, controlando a descida em 2 segundos.'
  },
  {
    id: 'crucifixo_inverso_maquina',
    name: 'Crucifixo Inverso na Máquina (Peck Deck Invertido)',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'machine',
    mets: 4.0,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'De frente para o encosto, abra os braços no plano horizontal focando na contração do deltoide posterior.'
  },

  // ================= BRAÇOS (BÍCEPS & TRÍCEPS) =================
  {
    id: 'rosca_direta_barra_w',
    name: 'Rosca Direta com Barra W',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 60,
    instructions: 'Cotovelos fixos ao lado do corpo. Flexione os antebraços erguendo a barra sem balançar a coluna.'
  },
  {
    id: 'rosca_martelo_halteres',
    name: 'Rosca Martelo com Halteres',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.0,
    minReps: 10,
    maxReps: 12,
    defaultRestSeconds: 60,
    instructions: 'Pegada neutra (palmas voltadas para dentro). Excelente para braquial e antebraço.'
  },
  {
    id: 'triceps_polia_corda',
    name: 'Tríceps na Polia com Corda',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    category: 'cable',
    mets: 4.0,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Estenda os cotovelos para baixo abrindo as pontas da corda na parte final do movimento para contração máxima da cabeça lateral.'
  },
  {
    id: 'triceps_testa_barra_w',
    name: 'Tríceps Testa com Barra W',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 75,
    instructions: 'Deitado no banco, desça a barra controladamente em direção à testa/topo da cabeça mantendo os cotovelos fechados e apontados para cima.'
  },

  // ================= PANTURRILHAS & ABDÔMEN =================
  {
    id: 'panturrilha_em_pe_maquina',
    name: 'Elevação de Panturrilha em Pé na Máquina',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.0,
    minReps: 12,
    maxReps: 18,
    defaultRestSeconds: 60,
    instructions: 'Alongue completamente o calcanhar na parte inferior e suba na ponta dos pés, segurando 1 segundo no topo.'
  },
  {
    id: 'abdominal_infra_paralela',
    name: 'Abdominal Infra na Paralela / Barra Fixa',
    primaryMuscle: 'abs',
    secondaryMuscles: [],
    category: 'bodyweight',
    mets: 5.0,
    minReps: 12,
    maxReps: 20,
    defaultRestSeconds: 60,
    instructions: 'Eleve as pernas flexionando a pelve em direção ao tórax, evitando o uso de impulso.'
  }
];

export const EXERCISE_DATABASE_MAP = new Map<string, Exercise>(
  EXERCISE_DATABASE.map(ex => [ex.id, ex])
);
