import { Exercise } from '../storage/types';

export const EXERCISE_DATABASE: Exercise[] = [
  // ==========================================
  // QUADRÍCEPS & MEMBROS INFERIORES
  // ==========================================
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
  {
    id: 'agachamento_hack_maquina',
    name: 'Agachamento Hack Máquina 45º',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    category: 'machine',
    mets: 6.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 120,
    instructions: 'Apoie as costas e ombros no encosto. Pés na largura dos ombros na base. Desça flexionando joelhos até 90º com segurança e empurre pela sola dos pés.'
  },
  {
    id: 'agachamento_smith_machine',
    name: 'Agachamento no Smith Machine',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings', 'abs'],
    category: 'machine',
    mets: 6.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 120,
    instructions: 'Barra guiada apoiada no trapézio. Posicione os pés ligeiramente à frente para maior ênfase no quadríceps e desça até 90º.'
  },
  {
    id: 'agachamento_pendulo',
    name: 'Agachamento Pêndulo (Pendulum Squat)',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes'],
    category: 'machine',
    mets: 6.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 120,
    instructions: 'Excelente máquina para isolamento de quadríceps com menor sobrecarga na coluna lombar.'
  },
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
    instructions: 'Pés na largura dos ombros, pontas levemente para fora. Desça flexionando quadril e joelhos até que as coxas fiquem paralelas ao chão.'
  },
  {
    id: 'agachamento_bulgaro_halteres',
    name: 'Agachamento Búlgaro com Halteres',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    category: 'compound',
    mets: 6.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Um pé apoiado atrás no banco. Desça o joelho de trás em direção ao chão, mantendo o tronco firme e empurrando com o calcanhar da perna da frente.'
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
    id: 'leg_press_horizontal',
    name: 'Leg Press Horizontal (Sentado)',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'calves'],
    category: 'machine',
    mets: 5.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 90,
    instructions: 'Sentado com encosto reto, empurre a plataforma estendendo as pernas sem travar os joelhos na extensão máxima.'
  },
  {
    id: 'passada_afundo_halteres',
    name: 'Avanço / Passada com Halteres',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    category: 'compound',
    mets: 6.0,
    minReps: 10,
    maxReps: 14,
    defaultRestSeconds: 90,
    instructions: 'Dê um passo à frente flexionando ambos os joelhos a 90º. Mantenha o tronco ereto e o joelho dianteiro alinhado com o tornozelo.'
  },
  {
    id: 'sissy_squat_maquina',
    name: 'Sissy Squat na Máquina / Livre',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Isolamento máximo para reto femoral e vastos. Incline o tronco para trás flexionando os joelhos.'
  },

  // ==========================================
  // POSTERIORES DE COXA (ISQUIOTIBIAIS)
  // ==========================================
  {
    id: 'cadeira_flexora',
    name: 'Cadeira Flexora (Sentada)',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves'],
    category: 'machine',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Sentado com as costas firmes no encosto e almofada travando as coxas. Flexione os joelhos puxando os calcanhares para baixo e para trás com contração máxima.'
  },
  {
    id: 'mesa_flexora',
    name: 'Mesa Flexora (Deitada)',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['calves'],
    category: 'machine',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Deitado de bruços, flexione as pernas trazendo o rolo em direção aos glúteos sem levantar o quadril do banco.'
  },
  {
    id: 'flexora_vertical_em_pe',
    name: 'Flexora Vertical Unilateral (Em Pé)',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.0,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Em pé, flexione uma perna por vez trazendo o calcanhar em direção ao glúteo com isolamento focado.'
  },
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
    id: 'rdl_romanian_deadlift',
    name: 'Levantamento Terra Romeno (RDL com Halteres)',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes'],
    category: 'compound',
    mets: 6.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Desça os halteres rente às pernas focando na flexão de quadril e mantendo a coluna 100% estabilizada.'
  },
  {
    id: 'bom_dia_good_morning',
    name: 'Good Morning (Bom Dia) com Barra',
    primaryMuscle: 'hamstrings',
    secondaryMuscles: ['glutes'],
    category: 'compound',
    mets: 5.0,
    minReps: 10,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Barra no trapézio. Incline o tronco à frente empurrando o quadril para trás mantendo as costas retas.'
  },

  // ==========================================
  // GLÚTEOS, ADUTORES & ABDUTORES
  // ==========================================
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
    instructions: 'Escápulas apoiadas no banco, barra sobre o quadril com almofada. Empurre com os calcanhares até alinhar com o tronco e contraia os glúteos no topo.'
  },
  {
    id: 'elevacao_pelvica_maquina',
    name: 'Elevação Pélvica na Máquina Articulada',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings'],
    category: 'machine',
    mets: 5.5,
    minReps: 8,
    maxReps: 14,
    defaultRestSeconds: 90,
    instructions: 'Cinto ou almofada travada no quadril. Excelente estabilidade para aplicar cargas progressivas no glúteo máximo.'
  },
  {
    id: 'cadeira_abdutora',
    name: 'Cadeira Abdutora',
    primaryMuscle: 'glutes',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.0,
    minReps: 12,
    maxReps: 20,
    defaultRestSeconds: 60,
    instructions: 'Sentado com tronco levemente inclinado à frente. Abra as pernas contra a resistência focando no glúteo médio e mínimo.'
  },
  {
    id: 'cadeira_adutora',
    name: 'Cadeira Adutora',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.0,
    minReps: 12,
    maxReps: 20,
    defaultRestSeconds: 60,
    instructions: 'Sentado, feche as pernas aproximando os joelhos contra a resistência para fortalecimento da parte interna da coxa.'
  },
  {
    id: 'gluteo_polia_coice',
    name: 'Glúteo na Polia (Coice com Tornozeleira)',
    primaryMuscle: 'glutes',
    secondaryMuscles: [],
    category: 'cable',
    mets: 4.0,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Tornozeleira presa na polia baixa. Estenda a perna para trás e para cima contraindo o glúteo no pico.'
  },

  // ==========================================
  // PEITORAL
  // ==========================================
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
    instructions: 'Deite-se no banco, pegada um pouco mais larga que os ombros, pés firmes no chão. Desça a barra controladamente até o peito e empurre.'
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
    id: 'supino_reto_halteres',
    name: 'Supino Reto com Halteres',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'compound',
    mets: 5.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Deitado no banco reto, empurre os halteres verticalmente aproximando no topo sem bater os pesos.'
  },
  {
    id: 'supino_inclinado_barra',
    name: 'Supino Inclinado com Barra',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'compound',
    mets: 6.0,
    minReps: 6,
    maxReps: 10,
    defaultRestSeconds: 120,
    instructions: 'Banco inclinado a 30º-45º. Desça a barra na clavícula superior e empurre com força do peitoral superior.'
  },
  {
    id: 'supino_reto_maquina',
    name: 'Supino Reto na Máquina Articulada / Sentado',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'machine',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Ajuste a altura do banco para as manoplas alinharem com o peito médio. Empurre com segurança e estabilidade.'
  },
  {
    id: 'supino_inclinado_maquina',
    name: 'Supino Inclinado na Máquina Articulada',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    category: 'machine',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Máquina convergente inclinada para foco na porção clavicular do peitoral.'
  },
  {
    id: 'peck_deck_voador',
    name: 'Peck Deck / Voador Peitoral na Máquina',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Sentado com as costas coladas no encosto. Feche os braços à frente contraindo o peitoral, segurando 1s no pico.'
  },
  {
    id: 'crossover_polia_alta',
    name: 'Cross Over na Polia Alta (Foco Inferior)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'cable',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Polias no topo. Puxe os cabos para baixo e para frente cruzando as mãos na altura do quadril.'
  },
  {
    id: 'crossover_polia_baixa',
    name: 'Cross Over na Polia Baixa (Foco Superior)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'cable',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Polias na base. Puxe os cabos para cima e para frente em direção ao queixo.'
  },
  {
    id: 'crucifixo_reto_halteres',
    name: 'Crucifixo Reto com Halteres',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Deitado no banco reto, abra os braços em arco com cotovelos levemente flexionados e sinta o alongamento das fibras.'
  },
  {
    id: 'crucifixo_inclinado_halteres',
    name: 'Crucifixo Inclinado com Halteres (30º)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    category: 'isolation',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Banco a 30º. Abra os halteres lateralmente sentindo o alongamento da porção clavicular.'
  },
  {
    id: 'paralelas_dips_peito',
    name: 'Barras Paralelas / Dips (Foco Peitoral)',
    primaryMuscle: 'chest',
    secondaryMuscles: ['triceps', 'shoulders'],
    category: 'bodyweight',
    mets: 6.0,
    minReps: 6,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Incline o tronco levemente à frente e abra os cotovelos para transferir a tensão para a parte inferior do peito.'
  },
  {
    id: 'pullover_haltere',
    name: 'Pullover com Halter / Barra',
    primaryMuscle: 'chest',
    secondaryMuscles: ['back'],
    category: 'isolation',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Deitado transversalmente no banco, desça o halter acima e atrás da cabeça alongando a caixa torácica.'
  },

  // ==========================================
  // COSTAS / DORSAIS / TRAPÉZIO
  // ==========================================
  {
    id: 'puxada_alta_frente',
    name: 'Puxada Alta Frontal na Polia (Aberta)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    category: 'cable',
    mets: 5.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Pegada aberta e pronada. Puxe a barra em direção à parte superior do peito, deprimindo as escápulas.'
  },
  {
    id: 'puxada_alta_triangulo',
    name: 'Puxada Alta com Triângulo (Pegada Neutra)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    category: 'cable',
    mets: 5.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Pegada neutra e fechada com triângulo. Permite excelente amplitude de movimento e ativação da grande dorsal.'
  },
  {
    id: 'puxada_articulada_maquina',
    name: 'Puxada Articulada na Máquina (Convergente)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    category: 'machine',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Sentado com peito apoiado ou livre. Puxe as manoplas independentes com trajetória convergente natural.'
  },
  {
    id: 'barra_fixa_pronada',
    name: 'Barra Fixa (Pull-up / Pronada)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    category: 'bodyweight',
    mets: 7.0,
    minReps: 5,
    maxReps: 10,
    defaultRestSeconds: 120,
    instructions: 'Pegada aberta pronada. Eleve o corpo até o queixo ultrapassar a barra, sem embalar as pernas.'
  },
  {
    id: 'graviton_barra_fixa',
    name: 'Barra Fixa Assistida no Graviton',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    category: 'machine',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Ajoelhado ou em pé na plataforma de contrapeso. Perfeito para ajustar a intensidade e focar na técnica.'
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
    instructions: 'Tronco inclinado a 45º, coluna neutra. Puxe a barra em direção ao umbigo, comprimindo as escápulas no topo.'
  },
  {
    id: 'remada_baixa_triangulo',
    name: 'Remada Baixa na Polia com Triângulo',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    category: 'cable',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Sentado com joelhos semi-flexionados. Puxe o triângulo até o abdômen projetando o peito para fora.'
  },
  {
    id: 'remada_cavalinho_tbar',
    name: 'Remada Cavalinho (T-Bar Row na Máquina / Barra)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps', 'shoulders'],
    category: 'compound',
    mets: 6.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Com apoio ou livre, puxe a manopla em direção ao abdômen com coluna 100% travada e neutra.'
  },
  {
    id: 'remada_articulada_maquina',
    name: 'Remada Articulada na Máquina (Pegada Neutra / Pronada)',
    primaryMuscle: 'back',
    secondaryMuscles: ['biceps'],
    category: 'machine',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Peito encostado no apoio. Puxe as manoplas articuladas focando no miolo das costas e grande dorsal.'
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
  {
    id: 'pulldown_polia_alta',
    name: 'Pulldown na Polia Alta com Barra / Corda',
    primaryMuscle: 'back',
    secondaryMuscles: ['triceps'],
    category: 'cable',
    mets: 4.5,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Braços quase retos. Puxe a barra/corda em direção às coxas em arco, isolando a grande dorsal.'
  },
  {
    id: 'levantamento_terra_deadlift',
    name: 'Levantamento Terra Tradicional (Deadlift)',
    primaryMuscle: 'back',
    secondaryMuscles: ['hamstrings', 'glutes', 'quadriceps', 'abs'],
    category: 'compound',
    mets: 8.0,
    minReps: 5,
    maxReps: 8,
    defaultRestSeconds: 180,
    instructions: 'Rei dos exercícios de força. Erga a barra do chão estendendo joelhos e quadril com postura perfeita.'
  },
  {
    id: 'encolhimento_ombros_barra',
    name: 'Encolhimento de Ombros com Barra / Halteres (Trapézio)',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'isolation',
    mets: 4.0,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Erga os ombros verticalmente em direção às orelhas sem girar as articulações, sustentando 1s no topo.'
  },
  {
    id: 'encolhimento_smith',
    name: 'Encolhimento de Ombros no Smith Machine',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'machine',
    mets: 4.0,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Barra guiada pela frente ou por trás para isolamento do trapézio superior com alta estabilidade.'
  },

  // ==========================================
  // OMBROS / DELTOIDES
  // ==========================================
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
    instructions: 'Sentado com banco a 85º. Empurre os halteres verticalmente acima da cabeça até quase estender os braços.'
  },
  {
    id: 'desenvolvimento_maquina',
    name: 'Desenvolvimento na Máquina Articulada',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'machine',
    mets: 5.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Sentado na máquina com pegada neutra ou pronada. Empurre verticalmente com controle na descida.'
  },
  {
    id: 'desenvolvimento_smith',
    name: 'Desenvolvimento Militar no Smith Machine',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps'],
    category: 'machine',
    mets: 5.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 90,
    instructions: 'Barra descendo até a altura do queixo/clavícula com trajetória guiada e segura.'
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
    instructions: 'Eleve os halteres lateralmente até a altura dos ombros com controle excêntrico de 2 segundos.'
  },
  {
    id: 'elevacao_lateral_polia',
    name: 'Elevação Lateral na Polia Baixa (Cabo)',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    category: 'cable',
    mets: 4.0,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Cabo passando por trás ou pela frente do corpo, mantendo tensão constante em todo o arco de movimento.'
  },
  {
    id: 'elevacao_lateral_maquina',
    name: 'Elevação Lateral na Máquina Sentado',
    primaryMuscle: 'shoulders',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.0,
    minReps: 12,
    maxReps: 18,
    defaultRestSeconds: 60,
    instructions: 'Apoie os antebraços nas almofadas e eleve lateralmente para isolamento sem compensação de trapézio.'
  },
  {
    id: 'elevacao_frontal_polia_halteres',
    name: 'Elevação Frontal na Polia / com Halteres',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['chest'],
    category: 'isolation',
    mets: 4.0,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Eleve a barra/halter à frente até a linha dos olhos, focando no deltoide anterior.'
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
  {
    id: 'face_pull_polia_corda',
    name: 'Face Pull na Polia com Corda',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['back'],
    category: 'cable',
    mets: 4.0,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Puxe a corda em direção ao rosto abrindo os cotovelos e fazendo rotação externa dos ombros.'
  },

  // ==========================================
  // BÍCEPS & ANTEBRAÇO
  // ==========================================
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
    id: 'rosca_scott_maquina',
    name: 'Rosca Scott na Máquina (Articulada)',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.0,
    minReps: 10,
    maxReps: 14,
    defaultRestSeconds: 60,
    instructions: 'Braços apoiados no banco Scott. Excelente pico de contração e isolamento da cabeça curta do bíceps.'
  },
  {
    id: 'rosca_banco_scott_barra_w',
    name: 'Rosca Banco Scott com Barra W / Halter',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.0,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 60,
    instructions: 'Axilas apoiadas no topo do banco. Desça a barra de forma controlada até quase a extensão completa.'
  },
  {
    id: 'rosca_martelo_halteres',
    name: 'Rosca Martelo com Halteres / Corda',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.0,
    minReps: 10,
    maxReps: 12,
    defaultRestSeconds: 60,
    instructions: 'Pegada neutra (palmas para dentro). Constrói densidade no braquial e braquiorradial (antebraço).'
  },
  {
    id: 'rosca_inclinada_45_halteres',
    name: 'Rosca 45º no Banco Inclinado com Halteres',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.0,
    minReps: 10,
    maxReps: 12,
    defaultRestSeconds: 60,
    instructions: 'Banco a 45º. Os braços começam para trás do tronco, gerando alongamento máximo da cabeça longa.'
  },
  {
    id: 'rosca_concentrada_halter',
    name: 'Rosca Concentrada com Halter',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 3.5,
    minReps: 10,
    maxReps: 14,
    defaultRestSeconds: 45,
    instructions: 'Sentado com cotovelo apoiado na parte interna da coxa. Isole o bíceps com controle estrito.'
  },
  {
    id: 'rosca_spider_banco_inclinado',
    name: 'Rosca Spider (Aranha) no Banco Inclinado',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.0,
    minReps: 10,
    maxReps: 14,
    defaultRestSeconds: 60,
    instructions: 'Peito apoiado no banco a 45º, braços pendurados verticalmente. Ponto de tensão máxima no pico.'
  },
  {
    id: 'rosca_inversa_barra_w',
    name: 'Rosca Inversa com Barra W (Antebraço)',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 3.5,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 45,
    instructions: 'Pegada pronada (palmas para baixo). Foco total em braquiorradial e extensores do punho.'
  },
  {
    id: 'rosca_punho_barra',
    name: 'Rosca Punho com Barra (Flexão de Punho)',
    primaryMuscle: 'biceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 3.0,
    minReps: 15,
    maxReps: 20,
    defaultRestSeconds: 45,
    instructions: 'Antebraços apoiados nas coxas ou banco, flexione apenas os punhos para hipertrofia dos flexores.'
  },

  // ==========================================
  // TRÍCEPS
  // ==========================================
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
    instructions: 'Estenda os cotovelos para baixo abrindo as pontas da corda na parte final para contração máxima da cabeça lateral.'
  },
  {
    id: 'triceps_polia_barra_reta_v',
    name: 'Tríceps na Polia com Barra Reta / Barra V',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    category: 'cable',
    mets: 4.0,
    minReps: 10,
    maxReps: 15,
    defaultRestSeconds: 60,
    instructions: 'Cotovelos travados nas costelas. Empurre a barra até a extensão total dos braços.'
  },
  {
    id: 'triceps_testa_barra_w',
    name: 'Tríceps Testa com Barra W / Halteres',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    category: 'isolation',
    mets: 4.5,
    minReps: 8,
    maxReps: 12,
    defaultRestSeconds: 75,
    instructions: 'Deitado no banco, desça a barra em direção à testa mantendo os cotovelos apontados para o teto.'
  },
  {
    id: 'triceps_frances_polia_corda',
    name: 'Tríceps Francês na Polia (Cabo / Halter)',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    category: 'cable',
    mets: 4.0,
    minReps: 10,
    maxReps: 14,
    defaultRestSeconds: 60,
    instructions: 'Polia na altura média/baixa, braços erguidos acima da cabeça estendendo para frente para alongar a cabeça longa.'
  },
  {
    id: 'triceps_mergulho_maquina',
    name: 'Tríceps Mergulho na Máquina (Dip Machine)',
    primaryMuscle: 'triceps',
    secondaryMuscles: ['chest', 'shoulders'],
    category: 'machine',
    mets: 4.5,
    minReps: 10,
    maxReps: 14,
    defaultRestSeconds: 60,
    instructions: 'Sentado com encosto firme, empurre as barras para baixo mantendo o tronco ereto e isolando o tríceps.'
  },
  {
    id: 'triceps_coice_polia_halter',
    name: 'Tríceps Coice na Polia / com Halter (Kickback)',
    primaryMuscle: 'triceps',
    secondaryMuscles: [],
    category: 'cable',
    mets: 3.5,
    minReps: 12,
    maxReps: 15,
    defaultRestSeconds: 45,
    instructions: 'Tronco inclinado, cotovelo elevado rente às costelas. Estenda o antebraço para trás.'
  },

  // ==========================================
  // PANTURRILHAS
  // ==========================================
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
    instructions: 'Alongue completamente o calcanhar na descida e suba na ponta dos pés, segurando 1s no topo.'
  },
  {
    id: 'panturrilha_sentado_burrico',
    name: 'Elevação de Panturrilha Sentado (Gêmeos / Burrico)',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    category: 'machine',
    mets: 3.5,
    minReps: 12,
    maxReps: 20,
    defaultRestSeconds: 60,
    instructions: 'Sentado com joelhos a 90º. Foco isolado no músculo Sóleo para dar espessura lateral à panturrilha.'
  },
  {
    id: 'panturrilha_leg_press_45',
    name: 'Panturrilha no Leg Press 45º / Horizontal',
    primaryMuscle: 'calves',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.0,
    minReps: 12,
    maxReps: 18,
    defaultRestSeconds: 60,
    instructions: 'Pontas dos pés na borda inferior da plataforma. Flexione e estenda os tornozelos com amplitude máxima.'
  },

  // ==========================================
  // ABDÔMEN & CORE
  // ==========================================
  {
    id: 'abdominal_maquina',
    name: 'Abdominal na Máquina (Crunch Machine)',
    primaryMuscle: 'abs',
    secondaryMuscles: [],
    category: 'machine',
    mets: 4.5,
    minReps: 12,
    maxReps: 20,
    defaultRestSeconds: 60,
    instructions: 'Sentado na máquina com pegadas ou apoio no peito. Flexione o tronco aproximando as costelas do quadril.'
  },
  {
    id: 'abdominal_polia_corda_supra',
    name: 'Abdominal Supra na Polia com Corda (Ajoelhado)',
    primaryMuscle: 'abs',
    secondaryMuscles: [],
    category: 'cable',
    mets: 4.5,
    minReps: 12,
    maxReps: 20,
    defaultRestSeconds: 60,
    instructions: 'Ajoelhado de frente para a polia com a corda na nuca. Enrole a coluna aproximando os cotovelos dos joelhos.'
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
    instructions: 'Eleve as pernas ou joelhos flexionando a pelve em direção ao tórax, sem balançar o corpo.'
  },
  {
    id: 'prancha_isometrica',
    name: 'Prancha Abdominal Isométrica',
    primaryMuscle: 'abs',
    secondaryMuscles: [],
    category: 'bodyweight',
    mets: 4.0,
    minReps: 30,
    maxReps: 60,
    defaultRestSeconds: 60,
    instructions: 'Apoie os antebraços e pontas dos pés no chão. Mantenha o corpo alinhado em linha reta e abdômen contraído.'
  },
  {
    id: 'roda_abdominal_wheel',
    name: 'Roda Abdominal (Ab Wheel Rollout)',
    primaryMuscle: 'abs',
    secondaryMuscles: ['shoulders', 'back'],
    category: 'bodyweight',
    mets: 5.5,
    minReps: 8,
    maxReps: 15,
    defaultRestSeconds: 75,
    instructions: 'Ajoelhado, role a roda à frente estendendo o corpo e puxe de volta contraindo intensamente o core.'
  }
];

export const EXERCISE_DATABASE_MAP = new Map<string, Exercise>(
  EXERCISE_DATABASE.map(ex => [ex.id, ex])
);
