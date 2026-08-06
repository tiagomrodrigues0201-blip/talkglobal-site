function makeCard(index, overrides = {}) {
  const elements = ['Solar', 'Metal', 'Vento'];
  const weapons = ['Espada de Vidro Solar', 'Escudo de Basalto', 'Arco de Aço Azul', 'Cajado de Prata Negra'];
  const families = ['lâmina', 'escudo', 'precisão', 'canalizador'];
  const names = ['Guardião Aurora', 'Sentinela Âmbar', 'Duelista Cobalto', 'Oráculo Prisma'];
  const archetypes = ['Guardião', 'Sentinela', 'Duelista', 'Oráculo'];
  return {
    id: `mock-card-${index + 1}`,
    characterName: names[index] || names[0],
    imageUrl: '',
    description: 'Arte demonstrativa local para validar o layout de cartas. Não é IA e não usa a foto privada do jogador.',
    archetype: archetypes[index] || archetypes[0],
    element: elements[index] || 'Lunar',
    elementId: (elements[index] || 'Lunar').toLowerCase(),
    power: ['Corte da Aurora', 'Muralha da Forja', 'Rajada do Trovão', 'Orbe do Eclipse'][index] || 'Pulso Lunar',
    weapon: weapons[index] || weapons[0],
    weaponFamily: families[index] || families[0],
    ability: ['Golpe Focado', 'Postura Firme', 'Impulso Rápido', 'Recarga Etérica'][index] || 'Golpe Focado',
    rarity: 'comum',
    rarityLabel: 'Comum',
    atk: [54, 42, 61, 47][index] || 50,
    def: [46, 66, 39, 44][index] || 45,
    spd: [43, 45, 69, 55][index] || 45,
    eng: [3, 3, 2, 4][index] || 3,
    hp: [148, 172, 136, 142][index] || 140,
    currentHp: [148, 172, 136, 142][index] || 140,
    level: 1,
    experience: 0,
    origin: 'initial',
    sourceType: 'initial',
    isInitial: true,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function enemyDeck() {
  return [
    makeCard(0, { id: 'mock-enemy-1', characterName: 'Treino Eco', atk: 38, def: 34, hp: 120, currentHp: 120 }),
    makeCard(1, { id: 'mock-enemy-2', characterName: 'Treino Calma', atk: 34, def: 42, hp: 130, currentHp: 130 }),
    makeCard(2, { id: 'mock-enemy-3', characterName: 'Treino Prisma', atk: 40, def: 31, hp: 110, currentHp: 110 })
  ];
}

function stateFrom(cards, deckIds, progression) {
  const deck = deckIds.map((id) => cards.find((card) => card.id === id)).filter(Boolean);
  return {
    cards,
    deck,
    deckIds,
    synergies: deck.length === 3 ? [{
      id: 'trindade_equilibrada',
      name: 'Trindade Equilibrada',
      description: 'Três elementos diferentes dão bônus geral.',
      bonus: { atk: 3, def: 3, spd: 3 }
    }] : [],
    progression
  };
}

function winner(battle) {
  const playerAlive = battle.player.deck.some((card) => card.currentHp > 0);
  const enemyAlive = battle.enemy.deck.some((card) => card.currentHp > 0);
  if (playerAlive && enemyAlive) return null;
  return playerAlive ? 'player' : 'enemy';
}

export function createCartasMockApi() {
  const params = new URLSearchParams(window.location.search);
  const forcedOutcome = params.get('mockOutcome') || '';
  const includeExtraCard = params.get('mockExtra') === '1';
  const store = {
    cards: [],
    deckIds: [],
    progression: { level_unlocked: 1, tutorial_completed: false, victories: 0, battles: 0, resources: 0 },
    battle: null
  };

  return {
    async handle(action, payload = {}) {
      if (action === 'state') return { ok: true, ...stateFrom(store.cards, store.deckIds, store.progression) };

      if (action === 'initial-cards') {
        if (!store.cards.length) {
          store.cards = [makeCard(0), makeCard(1), makeCard(2), ...(includeExtraCard ? [makeCard(3)] : [])];
          store.deckIds = store.cards.slice(0, 3).map((card) => card.id);
          return { ok: true, created: true, reason: 'mock_initial_cards_created', state: stateFrom(store.cards, store.deckIds, store.progression) };
        }
        return { ok: true, created: false, reason: 'mock_already_created', state: stateFrom(store.cards, store.deckIds, store.progression) };
      }

      if (action === 'save-deck') {
        const ids = Array.isArray(payload.cardIds) ? payload.cardIds.slice(0, 3) : [];
        if (ids.length !== 3 || ids.some((id) => !store.cards.some((card) => card.id === id))) {
          return { ok: false, error: 'invalid_mock_deck' };
        }
        store.deckIds = ids;
        return { ok: true, ...stateFrom(store.cards, store.deckIds, store.progression) };
      }

      if (action === 'start-tutorial') {
        const deck = store.deckIds.map((id) => store.cards.find((card) => card.id === id)).filter(Boolean);
        store.battle = {
          turn: 1,
          activePlayerIndex: 0,
          activeEnemyIndex: 0,
          player: { deck },
          enemy: { deck: enemyDeck() },
          log: [{ turn: 0, actor: 'system', message: 'Tutorial mock iniciado.' }]
        };
        return { ok: true, battleId: 'mock-battle-1', state: store.battle };
      }

      if (action === 'battle-action') {
        const player = store.battle.player.deck[store.battle.activePlayerIndex] || store.battle.player.deck.find((card) => card.currentHp > 0);
        const enemy = store.battle.enemy.deck[store.battle.activeEnemyIndex] || store.battle.enemy.deck.find((card) => card.currentHp > 0);
        const type = payload.battleAction?.type || 'attack';
        if (type === 'switch') {
          store.battle.activePlayerIndex = Number(payload.battleAction.cardIndex || 0);
          store.battle.log.push({ turn: store.battle.turn, actor: 'player', message: 'Carta ativa trocada.' });
        } else if (type === 'defend') {
          player.currentHp = Math.min(player.hp, player.currentHp + 4);
          store.battle.log.push({ turn: store.battle.turn, actor: 'player', message: 'Você defendeu.' });
        } else if (type === 'ability') {
          enemy.currentHp = Math.max(0, enemy.currentHp - 24);
          player.eng = Math.max(0, player.eng - 1);
          store.battle.log.push({ turn: store.battle.turn, actor: 'player', message: 'Habilidade causou 24 de dano.' });
        } else {
          enemy.currentHp = Math.max(0, enemy.currentHp - Math.max(0, player.atk - enemy.def));
          store.battle.log.push({ turn: store.battle.turn, actor: 'player', message: 'Ataque executado.' });
        }
        if (enemy.currentHp <= 0) {
          const nextEnemy = store.battle.enemy.deck.findIndex((card) => card.currentHp > 0);
          if (nextEnemy >= 0) store.battle.activeEnemyIndex = nextEnemy;
        }
        if (!winner(store.battle)) {
          const enemyDamage = forcedOutcome === 'defeat' ? 999 : 3;
          if (forcedOutcome === 'defeat') {
            store.battle.player.deck.forEach((card) => { card.currentHp = 0; });
          } else {
            player.currentHp = Math.max(0, player.currentHp - enemyDamage);
          }
          store.battle.log.push({ turn: store.battle.turn, actor: 'enemy', message: forcedOutcome === 'defeat' ? 'A máquina venceu o cenário de teste.' : 'A máquina respondeu com ataque leve.' });
          store.battle.turn += 1;
        }
        const wonBy = winner(store.battle);
        if (wonBy === 'player') {
          store.progression = { level_unlocked: 2, tutorial_completed: true, victories: 1, battles: 1, resources: 10 };
        }
        return { ok: true, battleId: 'mock-battle-1', state: store.battle, winner: wonBy, rewards: wonBy === 'player' ? { experience: 20, resources: 10, unlockedLevel: 2 } : {} };
      }

      return { ok: false, error: 'unknown_mock_action' };
    }
  };
}
