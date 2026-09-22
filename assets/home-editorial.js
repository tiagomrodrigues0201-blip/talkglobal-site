/*
 * Conteúdo editorial da home.
 * - Novos artigos entram automaticamente no destaque pela data de publicação.
 * - scripts/sync-home-editorial.mjs mantém os dois mais recentes em destaque.
 * - O item em destaque não se repete na grade de conteúdos recentes.
 * - Notícias entram na mesma fila editorial, sem uma seção separada na navegação.
 */
(() => {
  const homeContent = {
  "pinnedId": null,
  "items": [
    {
      "id": "-artigos-o-que-muda-quando-voce-para-de-visitar-e-comeca-a-viver-",
      "published": "2026-09-22",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "O que muda quando você para de visitar um lugar e começa a viver nele",
      "text": "Em Matinhos, dividir tarefas, refeições e conversas mudou nossa maneira de conhecer um lugar.",
      "image": "https://talkglobalapp.com/public/artigos/viagens/o-que-muda-quando-voce-para-de-visitar-e-comeca-a-viver/capa-tiago-rotina-voluntariado.jpg",
      "imageAlt": "Tiago limpando as mesas durante o voluntariado em Matinhos",
      "link": "/artigos/o-que-muda-quando-voce-para-de-visitar-e-comeca-a-viver/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-worldpackers-o-que-e-quanto-custa-como-comecar-",
      "published": "2026-09-22",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Worldpackers: o que é, quanto custa e como começar passo a passo",
      "text": "Worldpackers: cadastro, planos, escolha das oportunidades e o passo a passo para começar sua primeira experiência.",
      "image": "https://talkglobalapp.com/public/artigos/viagens/worldpackers-o-que-e-quanto-custa-como-comecar/capa-worldpackers-plataforma.jpg",
      "imageAlt": "Worldpackers, plataforma para experiências de voluntariado",
      "link": "/artigos/worldpackers-o-que-e-quanto-custa-como-comecar/",
      "button": "Ler o artigo"
    },
    {
      "id": "worldpackers-matinhos-primeiro-dia",
      "published": "2026-09-19T16:00:00-03:00",
      "eligible": true,
      "category": "Viagem real · Matinhos",
      "title": "Nosso primeiro dia como voluntários pela Worldpackers: chuva, cozinha e o mar a 40 metros",
      "text": "Chuva, cozinha, trabalho online e o mar a 40 metros: como foi nosso primeiro dia de voluntariado pela Worldpackers em Matinhos, no litoral do Paraná.",
      "image": "https://talkglobalapp.com/public/artigos/viagens/tiago-angelys-worldpackers-20260920.jpg",
      "imageAlt": "Tiago e Angelys durante o primeiro dia do voluntariado em Matinhos",
      "link": "/artigos/primeiro-dia-voluntarios-worldpackers-matinhos/",
      "button": "Ler o artigo"
    },
    {
      "id": "claude-biomolecular-modeling",
      "published": "2026-09-18T14:00:00-03:00",
      "eligible": true,
      "category": "Notícia · IA",
      "title": "Claude acelera mais de 30 modelos científicos em cerca de 4×",
      "text": "Segundo a Anthropic, Claude otimizou mais de 30 modelos abertos usados em biologia e reduziu em cerca de 4× o tempo médio de execução.",
      "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fb/Protein_Structure.png/1280px-Protein_Structure.png",
      "imageAlt": "Ilustração dos níveis de estrutura de proteínas",
      "link": "/noticias/claude-acelera-modelos-cientificos-biomoleculas/",
      "button": "Ler o artigo"
    },
    {
      "id": "-noticias-monstro-lizzie-borden-estreia-netflix-",
      "published": "2026-09-17T19:12:21+00:00",
      "eligible": true,
      "category": "Notícia",
      "title": "Monstro estreia temporada sobre Lizzie Borden com Ella Beatty e Charlie Hunnam",
      "text": "Quarta história da antologia de Ryan Murphy e Ian Brennan chega à Netflix com oito episódios.",
      "image": "https://dnm.nflximg.net/api/v6/2DuQlx0fM4wd1nzqm5BFBi6ILa8/AAAAQZBfuzcTx8EOfs52bDacxF0evg-k_XtJd3zUfy4Ipaq9sEP_SeqtbXsotaNyVzK-OYmMoPyOdTr6W8FGJSbYRBXBipVHHmog_Pxu8EWRkAxc8MEolS6yhAqmYJE5KcQPJSwLFC3xWm6xdX0cdc8ouAW_.jpg?r=f4d",
      "imageAlt": "Monstro estreia temporada sobre Lizzie Borden com Ella Beatty e Charlie Hunnam",
      "link": "/noticias/monstro-lizzie-borden-estreia-netflix/",
      "button": "Ler o artigo"
    },
    {
      "id": "-noticias-sacrifice-trailer-anya-taylor-joy-chris-evans-",
      "published": "2026-09-17T19:12:21+00:00",
      "eligible": true,
      "category": "Notícia",
      "title": "Sacrifice ganha trailer com Anya Taylor-Joy, Chris Evans e um culto que exige sacrifícios",
      "text": "Comédia sombria de Romain Gavras transforma uma festa beneficente em uma jornada rumo a um vulcão.",
      "image": "https://dnm.nflximg.net/api/v6/2DuQlx0fM4wd1nzqm5BFBi6ILa8/AAAAQaryf57SFXYEJu_fpJH9Z4v16MVeX804adWqT0_pT1NKWjR6zUwLvmKyNfPiVSCajUPbRwr4MXpgA6dLQzg-ZeiIqvolj0R22fm3PCXBRcgAaaUZMCjywCNa1JsDEzIedd-4SmOLBdywqM4AKxICpe1t.jpg?r=e1c",
      "imageAlt": "Sacrifice ganha trailer com Anya Taylor-Joy, Chris Evans e um culto que exige sacrifícios",
      "link": "/noticias/sacrifice-trailer-anya-taylor-joy-chris-evans/",
      "button": "Ler o artigo"
    },
    {
      "id": "openai-misalignment-2026",
      "published": "2026-09-17T16:12:00-03:00",
      "eligible": true,
      "category": "Notícia · IA",
      "title": "OpenAI revela casos em que modelos de IA ocultaram erros e agiram sem autorização",
      "text": "Empresa publicou seis relatórios sobre falhas observadas durante treinamento e avaliação de seus modelos.",
      "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/OpenAI_logo_with_magnifying_glass_%2852916339167%29.jpg/1280px-OpenAI_logo_with_magnifying_glass_%2852916339167%29.jpg",
      "imageAlt": "Logotipo da OpenAI fotografado através de uma lupa",
      "link": "/noticias/openai-modelos-ia-erros-sem-autorizacao/",
      "button": "Ler o artigo"
    },
    {
      "id": "stranger-things-historias-85-2",
      "published": "2026-09-17T16:10:00-03:00",
      "eligible": true,
      "category": "Notícia · Animação",
      "title": "Stranger Things: Histórias de 85 estreia segunda temporada com novo mistério em Hawkins",
      "text": "Animação reúne o grupo de amigos em uma investigação sobre flores misteriosas e aparições sobrenaturais.",
      "image": "https://dnm.nflximg.net/api/v6/2DuQlx0fM4wd1nzqm5BFBi6ILa8/AAAAQRLJUnwiBtPSF8haE9LXjddQZI9QkWUxejlFfSwcbJRaD3hrCWhkUvS6iCvqa4Z7S4Xyh4gX_A1Vz8X1C1PLG0S1rH2YnBKajuZCTtPLwNcZEW9HvoIjQlYLcI6fpGjYLiaBdqxyxgqexGnHEWd28VWs.jpg?r=bf1",
      "imageAlt": "Personagens da animação exploram uma floresta com lanternas",
      "link": "/noticias/stranger-things-historias-de-85-segunda-temporada/",
      "button": "Ler o artigo"
    },
    {
      "id": "freelancer-aos-40-historia",
      "published": "2026-09-03T12:00:00-03:00",
      "eligible": true,
      "category": "História real",
      "title": "Por que comecei como freelancer aos 40 mesmo depois de chegar a diretor geral",
      "text": "Fui de desempregado a diretor geral de uma imobiliária. Aos 40, comecei como freelancer e passei a trabalhar online para tentar realizar um sonho: conhecer o mundo.",
      "image": "https://talkglobalapp.com/public/artigos/freelancer/artigo-1-premiacao-tiago.jpg",
      "imageAlt": "Tiago e Angelys juntos durante a mudança para o trabalho online",
      "link": "/artigos/como-comecei-a-trabalhar-como-freelancer-aos-40/",
      "button": "Ler o artigo"
    },
    {
      "id": "freelancer-aos-40-primeiros-meses",
      "published": "2026-09-03T11:00:00-03:00",
      "eligible": true,
      "category": "Trabalho online",
      "title": "Como começar como freelancer aos 40: o que aprendemos nos primeiros meses",
      "text": "Começamos como freelancers aos 40, criamos portfólio e site, conseguimos nosso primeiro contrato e recebemos R$ 219. O que aprendemos nos primeiros meses.",
      "image": "https://talkglobalapp.com/public/artigos/freelancer/artigo-2-tiago-angelys-trabalho.jpg",
      "imageAlt": "Tiago e Angelys durante a trajetória profissional anterior ao trabalho freelancer",
      "link": "/artigos/como-comecar-como-freelancer-aos-40/",
      "button": "Ler o artigo"
    },
    {
      "id": "s-line-2026",
      "published": "2026-08-19T12:00:00-03:00",
      "eligible": true,
      "category": "Cultura pop",
      "title": "S Line pode ser o thriller coreano mais insano de 2026",
      "text": "S Line transforma relações escondidas em linhas visíveis e pode se tornar um dos thrillers coreanos mais comentados de 2026.",
      "image": "https://talkglobalapp.com/public/artigos/covers/s-line-thriller-coreano-mais-insano-2026.png",
      "imageAlt": "Capa editorial do thriller coreano S Line",
      "link": "/artigos/s-line-thriller-coreano-mais-insano-2026/",
      "button": "Ler o artigo"
    },
    {
      "id": "ling-cage",
      "published": "2026-08-18T12:00:00-03:00",
      "eligible": true,
      "category": "Obras asiáticas",
      "title": "Ling Cage pode ser o sci-fi chinês que o Brasil ainda não descobriu",
      "text": "Ling Cage mistura pós-apocalipse, monstros, sobrevivência e ficção científica em uma das animações chinesas mais ambiciosas dos últimos anos.",
      "image": "https://talkglobalapp.com/public/artigos/covers/ling-cage-sci-fi-chines-brasil-ainda-nao-descobriu.png",
      "imageAlt": "Capa editorial da animação chinesa Ling Cage",
      "link": "/artigos/ling-cage-sci-fi-chines-brasil-ainda-nao-descobriu/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-black-torch-pode-explodir-rapido-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Black Torch pode explodir rápido se o público perceber o que está chegando",
      "text": "Black Torch retorna como anime em 2026 e mistura mononoke, ação sobrenatural e estética shonen em uma obra que merece mais atenção agora.",
      "image": "https://talkglobalapp.com/public/artigos/covers/black-torch-pode-explodir-rapido.png",
      "imageAlt": "Capa editorial de Black Torch com arte real da obra e protagonista em destaque.",
      "link": "/artigos/black-torch-pode-explodir-rapido/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-daemons-of-the-shadow-realm-sair-sombra-fullmetal-alchemist-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Daemons of the Shadow Realm merece sair da sombra de Fullmetal Alchemist",
      "text": "Daemons of the Shadow Realm adapta o mangá de Hiromu Arakawa e combina dark fantasy, irmãos separados e criaturas sobrenaturais em uma das grandes apostas de 2026.",
      "image": "https://talkglobalapp.com/public/artigos/covers/daemons-of-the-shadow-realm-sair-sombra-fullmetal-alchemist.png",
      "imageAlt": "Capa editorial de Daemons of the Shadow Realm com capa real da obra e protagonista em destaque.",
      "link": "/artigos/daemons-of-the-shadow-realm-sair-sombra-fullmetal-alchemist/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-dark-moon-kpop-dark-fantasy-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Dark Moon mostra como o K-pop pode virar dark fantasy de verdade",
      "text": "Dark Moon: The Blood Altar une HYBE, ENHYPEN, webtoon e anime em uma aposta de fantasia urbana que mistura K-pop, vampiros e fandom global.",
      "image": "https://talkglobalapp.com/public/artigos/covers/dark-moon-kpop-dark-fantasy.png",
      "imageAlt": "Capa editorial de Dark Moon com visual real da obra e personagens em destaque.",
      "link": "/artigos/dark-moon-kpop-dark-fantasy/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-eleceed-manhwa-acao-furar-bolha-2026-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Eleceed pode ser o manhwa de ação que vai furar a bolha em 2026",
      "text": "Eleceed ganha anime em 2026 e combina ação, poderes, humor e carisma em um dos manhwas com maior potencial para alcançar o público de anime.",
      "image": "https://talkglobalapp.com/public/artigos/covers/eleceed-manhwa-acao-furar-bolha-2026.png",
      "imageAlt": "Capa editorial de Eleceed com visual real da obra e personagens em destaque.",
      "link": "/artigos/eleceed-manhwa-acao-furar-bolha-2026/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-link-click-donghua-deveria-estar-maior-brasil-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Link Click é o donghua que já deveria estar muito maior no Brasil",
      "text": "Link Click retorna com nova temporada em 2026 e combina viagem no tempo, drama e suspense em um dos donghuas mais fortes da China.",
      "image": "https://talkglobalapp.com/public/artigos/covers/link-click-donghua-deveria-estar-maior-brasil.png",
      "imageAlt": "Capa editorial de Link Click com poster real da obra e protagonistas em destaque.",
      "link": "/artigos/link-click-donghua-deveria-estar-maior-brasil/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-manager-kim-pai-comum-lenda-acao-coreana-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Manager Kim transforma um pai comum em uma lenda da ação coreana",
      "text": "Manager Kim adapta um webtoon coreano de ação e mostra como a Coreia transformou o arquétipo do pai comum em thriller explosivo.",
      "image": "https://talkglobalapp.com/public/artigos/covers/manager-kim-pai-comum-lenda-acao-coreana.png",
      "imageAlt": "Capa editorial de Manager Kim com imagem real da obra e protagonista em destaque.",
      "link": "/artigos/manager-kim-pai-comum-lenda-acao-coreana/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-nobody-animacao-chinesa-muda-conversa-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Nobody pode ser a animação chinesa que muda a conversa fora da bolha",
      "text": "Nobody se tornou um marco da animação 2D chinesa e mostra por que o mundo deveria prestar mais atenção ao cinema animado da China.",
      "image": "https://talkglobalapp.com/public/artigos/covers/nobody-animacao-chinesa-muda-conversa.png",
      "imageAlt": "Capa editorial de Nobody com poster real da obra e personagens em destaque.",
      "link": "/artigos/nobody-animacao-chinesa-muda-conversa/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-omniscient-reader-proximo-fenomeno-global-animes-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Omniscient Reader pode ser o próximo fenômeno global dos animes",
      "text": "Omniscient Reader’s Viewpoint reúne apocalipse, web novel, manhwa e anime anunciado em uma das franquias coreanas com maior potencial global.",
      "image": "https://talkglobalapp.com/public/artigos/covers/omniscient-reader-proximo-fenomeno-global-animes.png",
      "imageAlt": "Capa editorial de Omniscient Reader com imagem real da obra e protagonista em destaque.",
      "link": "/artigos/omniscient-reader-proximo-fenomeno-global-animes/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-the-east-palace-dark-fantasy-coreano-chamar-atencao-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "The East Palace pode ser o dark fantasy coreano que vai chamar atenção",
      "text": "The East Palace aposta em fantasmas, palácio amaldiçoado e fantasia histórica coreana para se tornar um dos dark fantasies asiáticos mais promissores.",
      "image": "https://talkglobalapp.com/public/artigos/covers/the-east-palace-dark-fantasy-coreano-chamar-atencao.png",
      "imageAlt": "Capa editorial de The East Palace com poster real da obra e elenco em destaque.",
      "link": "/artigos/the-east-palace-dark-fantasy-coreano-chamar-atencao/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-the-vermilion-mask-fantasia-mascaras-surpresa-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "The Vermilion Mask é a fantasia de máscaras que pode pegar muita gente de surpresa",
      "text": "The Vermilion Mask ganha anime em 2026 e aposta em máscaras de poder, culpa e redenção em uma fantasia de ação com visual muito forte.",
      "image": "https://talkglobalapp.com/public/artigos/covers/the-vermilion-mask-fantasia-mascaras-surpresa.png",
      "imageAlt": "Capa editorial de The Vermilion Mask com arte real da obra e protagonista em destaque.",
      "link": "/artigos/the-vermilion-mask-fantasia-mascaras-surpresa/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-tomb-raider-king-reliquias-regressao-hype-coreano-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Tomb Raider King pode transformar relíquias e regressão em hype coreano",
      "text": "Tomb Raider King ganha animação em 2026 e mistura tumbas divinas, relíquias poderosas e regressão temporal em uma fantasia coreana de alto potencial.",
      "image": "https://talkglobalapp.com/public/artigos/covers/tomb-raider-king-reliquias-regressao-hype-coreano.png",
      "imageAlt": "Capa editorial de Tomb Raider King com capa real da obra e protagonista em destaque.",
      "link": "/artigos/tomb-raider-king-reliquias-regressao-hype-coreano/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-veil-of-shadows-fantasia-chinesa-subestimada-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Veil of Shadows mostra que a fantasia chinesa ainda está sendo subestimada",
      "text": "Veil of Shadows mistura wuxia, romance, nove-caudas e fantasia chinesa em uma série visualmente forte que merece atenção fora da bolha.",
      "image": "https://talkglobalapp.com/public/artigos/covers/veil-of-shadows-fantasia-chinesa-subestimada.png",
      "imageAlt": "Capa editorial de Veil of Shadows com poster real da obra e elenco em destaque.",
      "link": "/artigos/veil-of-shadows-fantasia-chinesa-subestimada/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-who-made-me-a-princess-donghua-manhwa-fronteiras-",
      "published": "2026-06-30",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Who Made Me a Princess prova que donghua e manhwa já estão cruzando fronteiras",
      "text": "Who Made Me a Princess adapta uma web novel coreana em animação chinesa e mostra como manhwa, donghua e anime estão se misturando no mercado global.",
      "image": "https://talkglobalapp.com/public/artigos/covers/who-made-me-a-princess-donghua-manhwa-fronteiras.png",
      "imageAlt": "Capa editorial de Who Made Me a Princess com visual real da obra e protagonista em destaque.",
      "link": "/artigos/who-made-me-a-princess-donghua-manhwa-fronteiras/",
      "button": "Ler o artigo"
    },
    {
      "id": "-artigos-pick-me-up-proximo-grande-fenomeno-coreano-",
      "published": "2026-06-23",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "Pick Me Up pode ser o próximo grande fenômeno coreano",
      "text": "Pick Me Up começou a chamar atenção entre fãs de manhwa por sua premissa intensa, visual forte e enorme potencial de crescimento global.",
      "image": "https://talkglobalapp.com/public/artigos/covers/pick-me-up-proximo-grande-fenomeno-coreano.png",
      "imageAlt": "Arte oficial de Pick Me Up com protagonista em destaque, atmosfera escura, interface de gacha ao fundo e composição cinematográfica.",
      "link": "/artigos/pick-me-up-proximo-grande-fenomeno-coreano/",
      "button": "Ler o artigo"
    },
    {
      "id": "-blog-o-futuro-dos-animes-ja-esta-sendo-escrito-html",
      "published": "2026-06-08",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "O Futuro dos Animes Já Está Sendo Escrito",
      "text": "Kagurabachi, Centuria, Gokurakugai e The Bugle Call parecem carregar a energia dos próximos grandes fenômenos do anime.",
      "image": "https://talkglobalapp.com/public/blog/hesidio/artigos/futuro-dos-animes-8jun.png",
      "imageAlt": "O Futuro dos Animes Já Está Sendo Escrito",
      "link": "/blog/o-futuro-dos-animes-ja-esta-sendo-escrito.html",
      "button": "Ler o artigo"
    },
    {
      "id": "-blog-hesidio-verdadeiro-medo-sobreviver-pior-html",
      "published": "2026-05-27",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "HESIDIO: o verdadeiro medo não é morrer",
      "text": "HESIDIO reflete sobre sobrevivência, identidade e o medo de continuar vivo como algo irreconhecível dentro de um dark fantasy manga psicológico.",
      "image": "https://talkglobalapp.com/public/blog/hesidio/artigos/hesidio-ren-sobreviver.png",
      "imageAlt": "HESIDIO: o verdadeiro medo não é morrer",
      "link": "/blog/hesidio-verdadeiro-medo-sobreviver-pior.html",
      "button": "Ler o artigo"
    },
    {
      "id": "-blog-hesidio-zenkai-sofrimento-inevitavel-humanidade-html",
      "published": "2026-05-26",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "HESIDIO: Zenkai e o sofrimento inevitável da humanidade",
      "text": "Um artigo oficial de HESIDIO sobre Zenkai, sofrimento humano e o horror filosófico de uma compaixão que se torna ameaça.",
      "image": "https://talkglobalapp.com/public/blog/hesidio/artigos/hesidio-zenkai.png",
      "imageAlt": "HESIDIO: Zenkai e o sofrimento inevitável da humanidade",
      "link": "/blog/hesidio-zenkai-sofrimento-inevitavel-humanidade.html",
      "button": "Ler o artigo"
    },
    {
      "id": "-blog-hesidio-dois-querem-salvar-o-mundo-html",
      "published": "2026-05-25",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "HESIDIO: os dois querem salvar o mundo. Esse é o problema",
      "text": "HESIDIO transforma salvação em conflito filosófico: quando duas vontades querem salvar o mundo, o dark fantasy manga pergunta qual humanidade sobreviverá.",
      "image": "https://talkglobalapp.com/public/blog/hesidio/artigos/hesidio-ren-zenkai.png",
      "imageAlt": "HESIDIO: os dois querem salvar o mundo. Esse é o problema",
      "link": "/blog/hesidio-dois-querem-salvar-o-mundo.html",
      "button": "Ler o artigo"
    },
    {
      "id": "-blog-hesidio-ren-hazama-escolha-salvar-html",
      "published": "2026-05-24",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "HESIDIO: Ren Hazama e a pergunta que ninguém deveria fazer",
      "text": "Uma reflexão oficial de HESIDIO sobre Ren Hazama, culpa, escolha e o peso moral de salvar alguém em um dark fantasy manga existencial.",
      "image": "https://talkglobalapp.com/public/blog/hesidio/artigos/hesidio-ren-pensando.png",
      "imageAlt": "HESIDIO: Ren Hazama e a pergunta que ninguém deveria fazer",
      "link": "/blog/hesidio-ren-hazama-escolha-salvar.html",
      "button": "Ler o artigo"
    },
    {
      "id": "-blog-hesidio-mundo-esqueceu-memoria-identidade-html",
      "published": "2026-05-23",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "HESIDIO: quando o mundo começa a esquecer a si mesmo",
      "text": "Em HESIDIO, memória, identidade e horror existencial se tornam o centro de um dark fantasy manga sobre o medo de desaparecer antes da morte.",
      "image": "https://talkglobalapp.com/public/blog/hesidio/artigos/hesidio-mundo-esqueceu.png",
      "imageAlt": "HESIDIO: quando o mundo começa a esquecer a si mesmo",
      "link": "/blog/hesidio-mundo-esqueceu-memoria-identidade.html",
      "button": "Ler o artigo"
    },
    {
      "id": "-blog-hesidio-manga-dark-fantasy-lancamento-episodio-1-html",
      "published": "2026-05-22",
      "eligible": true,
      "category": "Artigo · Tiago",
      "title": "HESIDIO estreia hoje: mangá dark fantasy original abre seu Episódio 1",
      "text": "HESIDIO, original dark fantasy seinen manga da TalkGlobal Studios, estreia hoje à meia-noite com seu Episódio 1 online em um lançamento cercado por ruínas, trauma e mistério.",
      "image": "https://talkglobalapp.com/public/blog/hesidio/hesidio-ren-vs-zenkai-launch.png",
      "imageAlt": "HESIDIO estreia hoje: mangá dark fantasy original abre seu Episódio 1",
      "link": "/blog/hesidio-manga-dark-fantasy-lancamento-episodio-1.html",
      "button": "Ler o artigo"
    }
  ]
};

  const eligibleItems = homeContent.items
    .filter((item) => item.eligible !== false)
    .sort((a, b) => new Date(b.published) - new Date(a.published));

  const recentGrid = document.querySelector("[data-home-recent]");
  if (!recentGrid) return;

  const recentItems = eligibleItems.slice(2, 5);
  const fragment = document.createDocumentFragment();

  recentItems.forEach((item) => {
    const article = document.createElement("article");
    article.className = "recent-card";

    const mediaLink = document.createElement("a");
    mediaLink.className = "recent-card__media";
    mediaLink.href = item.link;

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.imageAlt;
    image.loading = "lazy";
    image.decoding = "async";
    mediaLink.appendChild(image);

    const copy = document.createElement("div");
    copy.className = "recent-card__copy";

    const category = document.createElement("span");
    category.textContent = item.category;

    const title = document.createElement("h3");
    const titleLink = document.createElement("a");
    titleLink.href = item.link;
    titleLink.textContent = item.title;
    title.appendChild(titleLink);

    const text = document.createElement("p");
    text.textContent = item.text;

    copy.append(category, title, text);
    article.append(mediaLink, copy);
    fragment.appendChild(article);
  });

  recentGrid.replaceChildren(fragment);
})();
