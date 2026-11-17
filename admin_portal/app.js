/* admin_portal/app.js - Unified Executive Admin Portal & Operations Dashboard
 * Strict Rust-Grade Rigor: Pure DOM API (document.createElement, textContent, replaceChildren).
 * ZERO Forbidden Sinks: Pure DOM creation only.
 */
(function () {
  "use strict";

  // System & Telemetry Constants
  var PIX_KEY = "vudotsur@gmail.com";
  var FIXED_MONTHLY_COST = 0.0;
  var STORAGE_THEME_KEY = "vudotsur_admin_theme";
  var STORAGE_LEDGER_KEY = "vudotsur_pix_ledger";
  var STORAGE_CHECKLIST_KEY = "vudotsur_action_checklist";

  // 6 Strategic Hubs
  var HUBS = [
    {
      id: "hub-low-ticket",
      title: "Hub 10 Ofertas Low-Ticket",
      category: "Conversão Direta",
      badge: "10 Ofertas",
      localPath: "../low_ticket_10/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/index.html",
      description: "Central unificada das 10 páginas especializadas de conversão direta com telemetria honesta de lucro, simulador de cenários e links prontos para WhatsApp."
    },
    {
      id: "hub-vitrine",
      title: "Vitrine Nacional 5.570 Cidades IBGE",
      category: "Storefront Hiper-Local",
      badge: "5.570 Cidades",
      localPath: "../vitrine/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/vitrine/index.html",
      description: "Storefront dinâmico hiper-local cobrindo todos os municípios do Brasil com SEO geo-localizado, copy humana de alta conversão e QR Code Pix instantâneo."
    },
    {
      id: "hub-portfolio",
      title: "Portfólio Executivo 5 PoCs",
      category: "Engenharia & Dados",
      badge: "5 PoCs Ativas",
      localPath: "../portfolio/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/portfolio/index.html",
      description: "Portfólio corporativo detalhando as 5 PoCs ativas de inteligência de mercado, cruzamento BACEN/CVM/IBGE e arquitetura Rust-Grade de alta resiliência."
    },
    {
      id: "hub-preproject",
      title: "Pre-Project Radar & Telemetria",
      category: "Validação Macroeconômica",
      badge: "Radar Diário",
      localPath: "../preproject/web/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/preproject/web/index.html",
      description: "Radar contínuo com snapshots automáticos diários de indicadores macroeconômicos sovereign (BCB, CVM, ComexStat) e comércio exterior."
    },
    {
      id: "hub-product",
      title: "Produto & Especificação API",
      category: "API & Integrações",
      badge: "REST OpenAPI",
      localPath: "../product/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/product/index.html",
      description: "Documentação completa da API REST, endpoints abertos, catálogo de métricas, especificação Swagger/OpenAPI e contratos JSON estritos."
    },
    {
      id: "hub-paper",
      title: "Apresentação & Paper Científico",
      category: "Acadêmico & Pesquisa",
      badge: "Padrão PhD",
      localPath: "../paper/presentation/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/",
      description: "Apresentação editorial executiva e monografia acadêmica em 6 capítulos estruturada para validação rigorosa com reprodutibilidade determinística."
    }
  ];

  // 10 Low-Ticket Offers (LT01..LT10)
  var OFFERS = [
    {
      txid: "LT01",
      title: "Guia + Planilha Anti-Inflação no Supermercado",
      audience: "Famílias e consumidores cortando até 28% no carrinho",
      price: 9.90,
      category: "economia",
      path: "../low_ticket_10/lt_01_mercado_economia/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_01_mercado_economia/index.html",
      pitch: "Planilha e guia prático para economizar no supermercado sem passar vontade:",
      keywords: "mercado economia compras inflacao comida familia gastos"
    },
    {
      txid: "LT02",
      title: "Kit Defesa do Consumidor: Modelos Procon & Cobrança Indevida",
      audience: "Consumidores resolvendo cobrança indevida e negativação sem advogado",
      price: 19.90,
      category: "juridico",
      path: "../low_ticket_10/lt_02_limpa_nome_procon/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_02_limpa_nome_procon/index.html",
      pitch: "Modelos prontos para resolver cobrança indevida no Procon e Consumidor.gov.br:",
      keywords: "limpa nome procon divida cobranca advogado consumidor serasa spc"
    },
    {
      txid: "LT03",
      title: "Kit Decisão CLT vs PJ + Checklist de Contrato & Impostos 2026",
      audience: "Profissionais CLT, PJ e freelancers calculando imposto no centavo",
      price: 19.90,
      category: "carreira",
      path: "../low_ticket_10/lt_03_clt_pj_calculadora/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_03_clt_pj_calculadora/index.html",
      pitch: "Descubra quanto sobra líquido no CLT vs PJ antes de assinar contrato:",
      keywords: "clt pj calculadora mei impostos das contrato proposta salario beneficio"
    },
    {
      txid: "LT04",
      title: "Pack Currículo Anti-Robô (ATS) + 25 Respostas de Entrevista",
      audience: "Profissionais buscando recolocação rápida e entrevistas de emprego",
      price: 14.90,
      category: "carreira",
      path: "../low_ticket_10/lt_04_curriculo_ats_entrevista/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_04_curriculo_ats_entrevista/index.html",
      pitch: "Passe nos filtros automáticos de RH e conquiste entrevistas de emprego:",
      keywords: "curriculo entrevista ia ats emprego vagas rh recrutamento"
    },
    {
      txid: "LT05",
      title: "Planilha Bola de Neve: Saia do Cartão e Cheque Especial em 90 Dias",
      audience: "Pessoas quitando dívidas com juros altos e organizando o orçamento no Pix",
      price: 12.90,
      category: "economia",
      path: "../low_ticket_10/lt_05_orcamento_dividas_zero/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_05_orcamento_dividas_zero/index.html",
      pitch: "Simule a quitação das suas dívidas e organize o mês sem aperto:",
      keywords: "orcamento dividas zero cartao juros bola de neve renegociacao reserva"
    },
    {
      txid: "LT06",
      title: "Corretor & Guia Anti-Erro de Referências ABNT para TCC",
      audience: "Universitários fazendo TCC, monografia e artigos científicos",
      price: 14.90,
      category: "estudos",
      path: "../low_ticket_10/lt_06_tcc_abnt_sem_erro/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_06_tcc_abnt_sem_erro/index.html",
      pitch: "Blinde as referências ABNT do seu TCC antes de entregar para a banca:",
      keywords: "tcc abnt sem erro referencias monografia artigo formatacao citacao"
    },
    {
      txid: "LT07",
      title: "Edital Verticalizado & Ciclo de Revisão Ebbinghaus para Concursos",
      audience: "Concurseiros organizando matérias e revisões com ciclo espaçado",
      price: 19.90,
      category: "estudos",
      path: "../low_ticket_10/lt_07_cronograma_concursos/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_07_cronograma_concursos/index.html",
      pitch: "Edital verticalizado com ciclo automático de revisão para concursos:",
      keywords: "cronograma concursos edital verticalizado ebbinghaus revisao simulado"
    },
    {
      txid: "LT08",
      title: "50 Mensagens Prontas de WhatsApp para Lojas e Autônomos Venderem Mais",
      audience: "Lojas, comerciantes, autônomos e vendedores fechando pedidos no WhatsApp",
      price: 17.90,
      category: "negocios",
      path: "../low_ticket_10/lt_08_whatsapp_vendas_loja/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_08_whatsapp_vendas_loja/index.html",
      pitch: "50 mensagens prontas de WhatsApp para copiar, colar e vender mais:",
      keywords: "whatsapp vendas loja mensagens script conversao fechamento cliente"
    },
    {
      txid: "LT09",
      title: "Caixa de Prompts Práticos para Pequenos Negócios",
      audience: "Comércios locais, autônomos e profissionais economizando tempo com IA",
      price: 24.90,
      category: "negocios",
      path: "../low_ticket_10/lt_09_prompts_negocios_ia/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_09_prompts_negocios_ia/index.html",
      pitch: "Prompts prontos para cardápio, posts de rede social e atendimento:",
      keywords: "prompts negocios ia produtividade checklist compra imovel carro modelos"
    },
    {
      txid: "LT10",
      title: "Monitor de Editais, Licitações e Concursos da Sua Cidade",
      audience: "Fornecedores municipais, MEIs e prestadores de serviço locais",
      price: 18.90,
      category: "negocios",
      path: "../low_ticket_10/lt_10_editais_londrina_cidades/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_10_editais_londrina_cidades/index.html",
      pitch: "Monitore editais e licitações da sua cidade sem burocracia:",
      keywords: "editais londrina cidades licitacoes prefeitura compras publicas contratos"
    },
    {
      txid: "LT11",
      title: "Kit MEI Lucrativo: Planilha 5 Abas de Fluxo de Caixa & DAS",
      audience: "Microempreendedores individuais (MEIs) e autônomos organizando caixa e separando PF de PJ",
      price: 37.00,
      category: "negocios",
      path: "../low_ticket_10/lt_11_kit_mei_fluxo_caixa/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_11_kit_mei_fluxo_caixa/index.html",
      pitch: "Descubra seu lucro real e organize o fluxo de caixa do seu MEI em 15 minutos:",
      keywords: "mei fluxo de caixa planilha faturamento das simples nacional maquininha lucro taxas"
    }
  ];

  // Action Plan Checklist (Daily Execution)
  var CHECKLIST_ITEMS = [
    { id: "chk_build", text: "Construir bundle estático Cloudflare (python scripts/build_cloudflare_bundle.py)" },
    { id: "chk_deploy", text: "Publicar na Cloudflare Pages Free (npx wrangler pages deploy dist_cloudflare --project-name=vitrine-brasil)" },
    { id: "chk_test", text: "Testar link público em aba anônima e verificar geração de QR Code Pix e cópia de chave" },
    { id: "chk_lt01", text: "Compartilhar Pitch Orgânico do LT01 (Economia no Supermercado) em grupos de WhatsApp / Status" },
    { id: "chk_lt02", text: "Postar Pitch do LT02 (Defesa do Consumidor / Limpa Nome) em Reels / Shorts / Stories" },
    { id: "chk_lt08", text: "Abordar 3 lojistas ou prestadores no WhatsApp com o Pitch do LT08 (50 Mensagens Prontas)" },
    { id: "chk_track", text: "Acompanhar confirmações de Pix em vudotsur@gmail.com e registrar no histórico local" }
  ];

  // Organic Conversion Pitches (LT01, LT02, LT08)
  var PITCHES = [
    {
      txid: "LT01",
      title: "Guia + Planilha Anti-Inflação no Supermercado",
      price: 9.90,
      audience: "Famílias e consumidores cortando até 28% no carrinho",
      path: "../low_ticket_10/lt_01_mercado_economia/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_01_mercado_economia/index.html",
      waPitch: "Oi! Tudo bem? Vi que muita gente tá assustada com o preço das compras de mercado ultimamente. Montei um Guia + Planilha prática Anti-Inflação que ajuda a cortar até 28% no carrinho sem abrir mão do que a família gosta. Custa só R$ 9,90 no Pix (menos que um pacote de café) e o acesso é liberado na hora. Se quiser ver como funciona: https://vudotsur.github.io/paper-intro/low_ticket_10/lt_01_mercado_economia/index.html",
      reelsPitch: "🚨 Você gasta mais de 800 reais no mercado e sai com a sensação de que não comprou nada? O erro tá na falta de conferência de preço por quilo e na lista cega. Com a Planilha Anti-Inflação de R$ 9,90 você corta até 28% da conta antes de passar no caixa. Link na bio para baixar no Pix!"
    },
    {
      txid: "LT02",
      title: "Kit Defesa do Consumidor: Modelos Procon & Cobrança Indevida",
      price: 19.90,
      audience: "Consumidores resolvendo cobrança indevida e negativação sem advogado",
      path: "../low_ticket_10/lt_02_limpa_nome_procon/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_02_limpa_nome_procon/index.html",
      waPitch: "Olá! Você já teve cobrança indevida de telefone, banco ou nome negativado sem aviso? Muita gente paga por cansaço ou gasta fortuna com advogado sem necessidade. Criei um Kit Defesa do Consumidor com modelos prontos para acionar o Procon e o Consumidor.gov.br em 10 minutos. Custa R$ 19,90 no Pix e resolve na fonte com base na lei: https://vudotsur.github.io/paper-intro/low_ticket_10/lt_02_limpa_nome_procon/index.html",
      reelsPitch: "⚠️ Seu nome foi para o Serasa ou SPC por uma cobrança que você não reconhece? Não precisa pagar nem se desesperar. O Código de Defesa do Consumidor prevê devolução em dobro do valor pago indevidamente. Criei os modelos prontos de notificação para o Procon por apenas R$ 19,90. Link na bio!"
    },
    {
      txid: "LT08",
      title: "50 Mensagens Prontas de WhatsApp para Lojas e Autônomos Venderem Mais",
      price: 17.90,
      audience: "Lojas, comerciantes, autônomos e vendedores fechando pedidos no WhatsApp",
      path: "../low_ticket_10/lt_08_whatsapp_vendas_loja/index.html",
      pagesUrl: "https://vudotsur.github.io/paper-intro/low_ticket_10/lt_08_whatsapp_vendas_loja/index.html",
      waPitch: "Oi! Você atende clientes pelo WhatsApp mas sente que perde muitas vendas porque a pessoa pergunta o preço e 'some'? Preparei um pacote com 50 Mensagens Prontas de WhatsApp testadas para lojistas e autônomos fecharem pedidos no mesmo dia, recuperarem clientes sumidos e tirarem dúvidas com simpatia. Custa só R$ 17,90 no Pix. Dá uma olhada aqui: https://vudotsur.github.io/paper-intro/low_ticket_10/lt_08_whatsapp_vendas_loja/index.html",
      reelsPitch: "💬 Cliente pergunta 'quanto custa?' no WhatsApp e depois nunca mais responde? O problema é mandar só o preço solto sem criar valor. Com o Pack de 50 Mensagens Prontas de WhatsApp, você recupera conversas frias e fecha vendas com scripts testados por R$ 17,90. Link na bio!"
    }
  ];

  // Platform Policies Vault (8 Platforms)
  var PLATFORMS_VAULT = [
  {
    "id": "google_ads",
    "name": "Google Ads & YouTube Advertising",
    "category": "Paid Advertising / PPC",
    "risk_level": "HIGH",
    "official_url": "https://support.google.com/adspolicy/answer/6008942",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Misrepresentation (Práticas Enganosas): promessas milagrosas de enriquecimento rápido, renda passiva garantida ou curas médicas sem respaldo científico.",
      "Circumventing Systems (Tentativa de Burlar Sistemas): cloaking, redirecionamento condicional baseado em IP/User-Agent, manipulação de DNS ou alteração de página pós-aprovação.",
      "Unacceptable Business Practices (Modelos de Negócios Inaceitáveis): indução a erro, omissão deliberada do modelo de cobrança ou faturamento oculto/recorrente sem consentimento expresso.",
      "Unrealistic Claims (Declarações Não Comprovadas): garantias financeiras sem base estatística ou depoimentos sem evidência verificável.",
      "Financial Services Non-Verification: veiculação de anúncios de serviços financeiros ou investimentos sem a devida certificação G2 Financial Services.",
      "Landing Page Transparency Failure: ausência visível de dados de contato do operador (e-mail, razão social, CNPJ/CPF), política de privacidade e termos claros de reembolso no rodapé."
    ],
    "mandatory_controls": [
      "Inclusão obrigatória de rodapé transparente com links para Política de Privacidade, Termos de Uso e Política de Reembolso (CDC Art. 49).",
      "Declaração explícita de isenção de responsabilidade (disclaimer): 'Resultados variam conforme o esforço individual e dedicação na execução'.",
      "Conformidade total entre o criativo/anúncio e a promessa da Landing Page (1:1 message match, sem ganchos desconexos).",
      "Zero redirecionamento dinâmico ou alterações de DOM baseadas no Googlebot crawler.",
      "Verificação de Identidade do Anunciante (Google Advertiser Verification) concluída antes do escalonamento de orçamento."
    ],
    "roi_best_practices": [
      "Segmentação com palavras-chave exatas e negativação proativa diária de termos irrelevantes ou de baixa intenção comercial ('grátis', 'crack', 'reclame aqui').",
      "Otimização contínua do Índice de Qualidade (Quality Score >= 8/10) via aumento de CTR e taxa de engajamento na página de destino.",
      "Monitoramento automatizado do status de anúncios com tempo de resposta < 24h para recursos de reprovação ('Disapproved' ou 'Eligible (Limited)')."
    ]
  },
  {
    "id": "meta_ads",
    "name": "Meta Ads (Facebook & Instagram)",
    "category": "Paid Advertising / Social",
    "risk_level": "HIGH",
    "official_url": "https://www.facebook.com/policies_center/ads",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Atributos Pessoais (Personal Attributes): perguntas diretas ou insinuações sobre a condição do usuário ('Você está endividado?', 'Cansado de estar quebrado?', 'Sofre de depressão?').",
      "Resultados Irreais e Promessas Excessivas: imagens de antes/depois, prints de saldos bancários ou faturamentos milagrosos, promessa de enriquecimento rápido.",
      "Conteúdo de Baixa Qualidade e Disruptivo: landing pages com pop-ups abusivos, falsos botões de reprodução de mídia, bloqueio de botão voltar do navegador.",
      "Circumventing Systems: criação de novas contas ou BMs após bloqueio anterior, mascaramento de domínios ou uso de caracteres especiais para ocultar palavras proibidas.",
      "Falha de Verificação de Domínio: veicular anúncios sem o domínio validado via registro DNS TXT no Meta Business Manager."
    ],
    "mandatory_controls": [
      "Verificação de Domínio ativa no Business Manager via registro DNS TXT.",
      "Redação de copy em terceira pessoa ou foco no método/produto ('Como profissionais organizam o orçamento' em vez de 'Você está endividado?').",
      "Implementação híbrida de rastreamento: Meta Pixel client-side aliado à Conversions API (CAPI) server-side para envio seguro de eventos.",
      "Rodapé obrigatório na LP com link para Política de Privacidade, Termos de Uso e declaração formal de não vinculação com a Meta ('Este site não faz parte do Facebook ou Meta Inc.').",
      "Aquecimento gradual de contas de anúncio (Daily Spend Warmup) sem saltos bruscos de orçamento nas primeiras semanas."
    ],
    "roi_best_practices": [
      "Testes criativos modulares (3 a 5 variações de criativos por conjunto) alternando ganchos emocionais, racionais e demonstrações práticas do produto.",
      "Exclusão estrita de compradores dos públicos de prospecção para evitar canibalização de investimento publicitário.",
      "Monitoramento e manutenção da pontuação de feedback da página de anúncios (Customer Feedback Score > 4.0) para prevenir penalidades no CPM."
    ]
  },
  {
    "id": "cloudflare_pages",
    "name": "Cloudflare Pages & Workers",
    "category": "Static Web Hosting / Edge CDN",
    "risk_level": "LOW",
    "official_url": "https://pages.cloudflare.com",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Violação da Seção 2.8 dos Termos de Serviço da Cloudflare: hospedagem de phishing, malware, ransomware ou conteúdo fraudulento.",
      "Distribuição de material pirateado, violação de propriedade intelectual e descumprimento de notificações válidas de DMCA.",
      "Abuso de rede ou ataque cibernético (DDoS, port scanning, scraping predatório) originado a partir de Workers ou Pages vinculados.",
      "Criação em massa de subdomínios temporários para esquemas de spam ou redirecionamento ilícito."
    ],
    "mandatory_controls": [
      "Uso explícito do Cloudflare Pages Free Tier, que permite 100% o uso comercial (commercial use permitted) com bandwidth ilimitado sem custo fixo mensal.",
      "Configuração obrigatória de cabeçalhos de segurança via arquivo `_headers` no diretório raiz do deploy (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, CSP).",
      "Habilitação de DNSSEC, Always Use HTTPS e TLS 1.3 obrigatórios no painel da Cloudflare.",
      "Isolamento de credenciais via Scoped API Tokens com permissão mínima de acesso (Pages/Workers), sem compartilhamento de Global API Keys."
    ],
    "roi_best_practices": [
      "Aproveitamento da rede global Anycast da Cloudflare com TTFB < 50ms para garantir máxima pontuação no Google Core Web Vitals.",
      "Infraestrutura com custo de hospedagem $0/mês para landing pages de alta escala, eliminando riscos de faturas surpresa por picos de acessos.",
      "Automação de CI/CD atômico com deploy instantâneo e capacidade de rollback em menos de 10 segundos em caso de anomalia."
    ]
  },
  {
    "id": "github_pages",
    "name": "GitHub Pages",
    "category": "Static Web Hosting / Open Source & Docs",
    "risk_level": "MEDIUM",
    "official_url": "https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#usage-limits",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Uso comercial primário para e-commerce ou monetização contínua: os Termos de Serviço do GitHub Pages proíbem o uso como storefront transacional comercial contínuo.",
      "Violação de cotas e limites operacionais: repositórios de páginas com mais de 1 GB, consumo de banda superior a 100 GB/mês ou mais de 10 builds por hora.",
      "Mineração de criptomoedas, hospedagem de conteúdo abusivo ou uso do serviço como CDN para arquivos binários pesados.",
      "Hospedagem de phishing, kits de roubo de credenciais ou violações de marcas registradas."
    ],
    "mandatory_controls": [
      "Restrição exclusiva do GitHub Pages para documentação técnica de software, portfólios institucionais, papers acadêmicos e repositórios open-source.",
      "Transferência e hospedagem de quaisquer landing pages comerciais ou lojas virtuais transacionais diretamente no Cloudflare Pages.",
      "Otimização rigorosa de assets estáticos mantendo o tamanho do repositório de documentação bem abaixo do teto de 1 GB.",
      "Prevenção absoluta de commits contendo chaves de API, tokens de acesso ou segredos em repositórios atrelados ao GitHub Pages."
    ],
    "roi_best_practices": [
      "Construção de autoridade e Prova Técnica (Technical Social Proof) através de documentações públicas e relatórios de pesquisa acadêmica hospedados sem custo.",
      "Aproveitamento de integração nativa com o ecossistema GitHub para demonstrar conformidade e rigor metodológico perante clientes corporativos.",
      "Economia de 100% de custos de servidores para repositórios educacionais e acadêmicos mantendo cache global via Fastly CDN subjacente ao GitHub."
    ]
  },
  {
    "id": "infoproduct_platforms",
    "name": "Infoproduct Platforms & MoR (Polar.sh, Kiwify, Hotmart)",
    "category": "Infoproduct Gateways & Merchant of Record",
    "risk_level": "HIGH",
    "official_url": "https://polar.sh/legal/terms",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Inconsistência cadastral ou falsidade no KYC (Know Your Customer) da conta comercial ou do titular responsável.",
      "Comercialização em nichos expressamente vedados: apostas/cassinos, esquemas de pirâmide financeira, produtos eróticos ou falsas curas sem registro na ANVISA.",
      "Taxa de chargebacks / contestações bancárias acima de 1% a 2% do total de transações, acarretando bloqueio cautelar da conta e retenção financeira de 90 a 180 dias.",
      "Uso de escassez falsa ('Últimas 2 vagas' com contadores reiniciáveis) e depoimentos forjados sem consentimento do titular.",
      "Descumprimento grave de SLA de entrega do infoproduto digital acordado na página de pagamento."
    ],
    "mandatory_controls": [
      "Utilização do Polar.sh como Merchant of Record (MoR) para vendas globais com cartão de crédito, delegando o recolhimento tributário internacional (VAT/Sales Tax) e compliance antifraude.",
      "Cadastro auditado com CNPJ ativo e regular nas plataformas locais (Kiwify, Hotmart, etc.) para transações nacionais.",
      "Entrega automatizada imediata do infoproduto via Webhook idempotente assim que o evento de pagamento for confirmado (SLA < 10 segundos).",
      "Apresentação ostensiva da garantia legal de 7 dias (CDC Art. 49) no checkout com fluxo simplificado de autoatendimento para estornos.",
      "Canal de suporte direto visível para atendimento a clientes antes que iniciem disputa bancária de chargeback."
    ],
    "roi_best_practices": [
      "Configuração de Order Bumps e Upsells de 1 clique coerentes e complementares à oferta principal, elevando o Ticket Médio (AOV) em até 30%.",
      "Fluxo automatizado de recuperação de vendas de boletos e Pix não pagos via mensageria humanizada em até 2 horas.",
      "Segregação estrita de ambientes de Sandbox e Produção para evitar transações de teste poluindo os índices reais de conversão e chargeback."
    ]
  },
  {
    "id": "whatsapp_organic",
    "name": "WhatsApp Organic & Conversational Commerce",
    "category": "Direct Messaging / Conversational Commerce",
    "risk_level": "CRITICAL",
    "official_url": "https://www.whatsapp.com/legal/business-policy",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Disparo em massa não solicitado (Unsolicited Bulk Spam) para contatos frios sem consentimento prévio.",
      "Taxa elevada de denúncias e bloqueios de contato ('Bloquear e denunciar') em janela curta de tempo.",
      "Utilização de ferramentas de automação não oficiais (bots não autorizados, scrapers de web sem API Cloud oficial da Meta) com velocidade desumana de digitação.",
      "Envio de mensagens idênticas sem variação léxica ou de formatação para dezenas de destinatários simultâneos.",
      "Oferta de produtos ou serviços contrários à Política Comercial do WhatsApp (armas, apostas, suplementos não regulamentados, esquemas financeiros)."
    ],
    "mandatory_controls": [
      "Fluxo estritamente receptivo baseado em opt-in explícito do usuário via botões Click-to-Chat (`wa.me/55...`) acionados voluntariamente na landing page.",
      "Uso de conta comercial verificada no aplicativo WhatsApp Business ou através da API Cloud oficial da Meta.",
      "Aplicação de jitter humano aleatório (pausas entre digitação e envio) em qualquer resposta assistida, simulando cadência natural.",
      "Abordagem Value-First: responder a dúvida real do cliente e fornecer valor concreto antes de apresentar qualquer link de compra.",
      "Acatamento imediato e definitivo de comandos de descadastramento ('Sair', 'Parar', 'Não tenho interesse'), cessando qualquer nova abordagem."
    ],
    "roi_best_practices": [
      "Direcionamento exclusivo de tráfego de alta intenção (visitantes que passaram mais de 60s na página ou clicaram no suporte de dúvidas).",
      "Uso de Respostas Rápidas configuradas no WhatsApp Business para atendimento veloz de dúvidas recorrentes mantendo tom cordial.",
      "Monitoramento periódico do status de qualidade do número telefônico no Meta Business Manager mantendo indicador 'Verde' (High Quality)."
    ]
  },
  {
    "id": "brazil_consumer_lgpd",
    "name": "Código de Defesa do Consumidor (CDC) & LGPD",
    "category": "Brazilian Consumer Law & Data Privacy",
    "risk_level": "HIGH",
    "official_url": "https://www.gov.br/anpd/pt-br",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Publicidade Enganosa ou Abusiva (CDC Art. 37): alegações falsas sobre características, propriedades, validade ou origem de produtos digitais.",
      "Recusa ou Dificultação do Direito de Arrependimento (CDC Art. 49): criar barreiras, prazos abusivos ou cobrar taxas para devolução de valor em compras realizadas fora do estabelecimento comercial (prazo legal de 7 dias corridos).",
      "Violação aos Direitos dos Titulares de Dados (LGPD Arts. 7º e 18): coleta excessiva sem finalidade explícita, tratamento sem base legal adequada ou recusa em atender solicitações de exclusão/portabilidade.",
      "Emprego de Dark Patterns: designs indutivos que forçam o consumidor a aceitar cobranças automáticas recorrentes ou dificultam o cancelamento do serviço."
    ],
    "mandatory_controls": [
      "Disponibilização de fluxo simplificado de reembolso incondicional em até 7 dias corridos a partir da data de compra/acesso.",
      "Arquitetura Zero-Cookie ou emprego de banner de consentimento simplificado apenas para scripts essenciais de telemetria.",
      "Indicação explícita e pública no rodapé da página do Encarregado de Dados (DPO / Operador) com canal de e-mail funcional para solicitações LGPD.",
      "Publicação de Termos de Uso e Política de Privacidade redigidos de forma clara, contendo razão social, CNPJ ou identificação do responsável e canal de contato.",
      "Segregação e proteção de dados pessoais sob rígido controle de acesso, vedando compartilhamento não autorizado com terceiros."
    ],
    "roi_best_practices": [
      "Destaque ostensivo do selo de garantia incondicional de 7 dias respaldado pelo CDC Art. 49 na página de vendas, gerando redução de atrito e aumento de conversão.",
      "Atendimento pró-ativo pós-venda para dirimir dúvidas nos primeiros 3 dias, reduzindo a taxa real de pedidos de cancelamento para menos de 2%.",
      "Eliminação total de passivos judiciais no JEC ou sanções administrativas da ANPD mediante conformidade preventiva rigorosa."
    ]
  },
  {
    "id": "bacen_pix",
    "name": "Bacen Pix (Resolução BCB nº 1/2020) & SPI",
    "category": "Instant Payment Infrastructure (Brazil Central Bank)",
    "risk_level": "CRITICAL",
    "official_url": "https://www.bcb.gov.br/estabilidadefinanceira/pix",
    "last_verified": "2026-11-16",
    "ban_triggers": [
      "Inobservância das especificações técnicas do padrão EMVCo CRC16-CCITT para QR Code Pix estático ou dinâmico, gerando falha de leitura em apps bancários.",
      "Notificações reiteradas de Infração no Mecanismo Especial de Devolução (MED) por suspeita de fraude, golpe da falsa entrega ou contestação de má-fé.",
      "Utilização de txid em formato inválido ou não conforme com os requisitos do Banco Central (tamanho, caracteres alfanuméricos permitidos, quebra de unicidade).",
      "Simulação de intermediação financeira ou operação sem adesão aos participantes regulados do Sistema de Pagamentos Instantâneos (SPI)."
    ],
    "mandatory_controls": [
      "Geração de payloads Pix em estrita conformidade com a Resolução BCB nº 1/2020 e manuais de especificação técnica do Banco Central do Brasil.",
      "Cálculo matemático rigoroso do checksum CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) posicionado no final da string EMVCo (ID 63).",
      "Uso de txid estruturado e tabela de deduplicação idempotente no backend para impedir duplo processamento de pagamentos.",
      "Prevenção ativa de contestações no MED: entrega imediata do infoproduto digital por e-mail e exibição de credenciais/acesso na tela pós-confirmação com log de auditoria.",
      "Utilização de provedores de API Pix homologados junto ao BACEN (Efi Bank, Mercado Pago, Asaas) ou geração de Pix estático validado por testes de integridade."
    ],
    "roi_best_practices": [
      "Liquidação financeira instantânea (D+0 imediato) sem espera de repasses de 30 dias de cartão de crédito tradicional.",
      "Economia de taxas de transação em até 80% quando comparado com taxas de processamento de cartões de crédito e intermediações tradicionais.",
      "Integração de Webhooks com confirmação em tempo real e reprocessamento assíncrono garantindo 100% de disponibilidade nas vendas."
    ]
  }
];

  // Helper: Format BRL
  function formatBRL(value) {
    var num = Number(value) || 0;
    return num.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Toast Notification
  var toastTimer = null;
  function showToast(message) {
    var toast = document.getElementById("admin-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.add("hidden");
    }, 2800);
  }

  // Clipboard Copy with Fallback
  function copyText(text, okMessage) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).then(
        function () {
          showToast(okMessage);
        },
        function () {
          fallbackCopy(text, okMessage);
        }
      );
      return;
    }
    fallbackCopy(text, okMessage);
  }

  function fallbackCopy(text, okMessage) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast(okMessage);
    } catch (_err) {
      showToast("Copie manualmente: " + text);
    }
    document.body.removeChild(ta);
  }

  // WhatsApp Share URL Builder
  function buildWhatsAppShareUrl(offer) {
    var resolvedUrl = new URL(offer.path, window.location.href).href;
    var message = offer.pitch + " " + resolvedUrl;
    return "https://wa.me/?text=" + encodeURIComponent(message);
  }

  // Theme Management (Dark / Light)
  function initTheme() {
    var saved = localStorage.getItem(STORAGE_THEME_KEY);
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = saved ? saved === "dark" : prefersDark;

    applyTheme(isDark);

    var toggleBtn = document.getElementById("theme-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        var currentIsDark = document.documentElement.classList.contains("dark");
        applyTheme(!currentIsDark);
      });
    }
  }

  function applyTheme(isDark) {
    var sunIcon = document.getElementById("theme-sun-icon");
    var moonIcon = document.getElementById("theme-moon-icon");

    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem(STORAGE_THEME_KEY, "dark");
      if (sunIcon) sunIcon.classList.remove("hidden");
      if (moonIcon) moonIcon.classList.add("hidden");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem(STORAGE_THEME_KEY, "light");
      if (sunIcon) sunIcon.classList.add("hidden");
      if (moonIcon) moonIcon.classList.remove("hidden");
    }
  }

  // Render 6 Strategic Hubs
  function renderHubs() {
    var container = document.getElementById("hubs-grid");
    if (!container) return;

    container.replaceChildren();

    HUBS.forEach(function (hub) {
      var card = document.createElement("article");
      card.className = "p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between gap-4 transition hover:border-indigo-400 dark:hover:border-indigo-700/60";

      // Top Header
      var topDiv = document.createElement("div");
      topDiv.className = "space-y-2.5";

      var metaRow = document.createElement("div");
      metaRow.className = "flex items-center justify-between gap-2";

      var catBadge = document.createElement("span");
      catBadge.className = "text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider";
      catBadge.textContent = hub.category;

      var tagBadge = document.createElement("span");
      tagBadge.className = "px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60";
      tagBadge.textContent = hub.badge;

      metaRow.appendChild(catBadge);
      metaRow.appendChild(tagBadge);

      var titleEl = document.createElement("h3");
      titleEl.className = "text-base font-bold text-slate-900 dark:text-white leading-snug";
      titleEl.textContent = hub.title;

      var descEl = document.createElement("p");
      descEl.className = "text-xs text-slate-600 dark:text-slate-300 leading-relaxed";
      descEl.textContent = hub.description;

      topDiv.appendChild(metaRow);
      topDiv.appendChild(titleEl);
      topDiv.appendChild(descEl);

      // Actions
      var actionsDiv = document.createElement("div");
      actionsDiv.className = "pt-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2";

      var primaryRow = document.createElement("div");
      primaryRow.className = "grid grid-cols-2 gap-2";

      var openLocalBtn = document.createElement("a");
      openLocalBtn.href = hub.localPath;
      openLocalBtn.className = "py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold text-center transition shadow-sm";
      openLocalBtn.textContent = "Abrir Local";

      var openPagesBtn = document.createElement("a");
      openPagesBtn.href = hub.pagesUrl;
      openPagesBtn.target = "_blank";
      openPagesBtn.rel = "noopener noreferrer";
      openPagesBtn.className = "py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold text-center transition border border-slate-200 dark:border-slate-700/60";
      openPagesBtn.textContent = "Ver Pages";

      primaryRow.appendChild(openLocalBtn);
      primaryRow.appendChild(openPagesBtn);

      var copyRow = document.createElement("div");
      copyRow.className = "grid grid-cols-2 gap-2";

      var copyLocalBtn = document.createElement("button");
      copyLocalBtn.type = "button";
      copyLocalBtn.className = "py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-200 dark:border-slate-700/50 transition";
      copyLocalBtn.textContent = "Copiar Link Local";
      copyLocalBtn.addEventListener("click", function () {
        var fullLocal = new URL(hub.localPath, window.location.href).href;
        copyText(fullLocal, "Link local copiado (" + hub.title + ")!");
      });

      var copyPagesBtn = document.createElement("button");
      copyPagesBtn.type = "button";
      copyPagesBtn.className = "py-1.5 px-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-medium border border-slate-200 dark:border-slate-700/50 transition";
      copyPagesBtn.textContent = "Copiar URL Pages";
      copyPagesBtn.addEventListener("click", function () {
        copyText(hub.pagesUrl, "URL GitHub Pages copiada!");
      });

      copyRow.appendChild(copyLocalBtn);
      copyRow.appendChild(copyPagesBtn);

      actionsDiv.appendChild(primaryRow);
      actionsDiv.appendChild(copyRow);

      card.appendChild(topDiv);
      card.appendChild(actionsDiv);
      container.appendChild(card);
    });
  }

  // Render TikTok & TikTok Shop Automation Pipeline Card
  function renderTikTokPipelineCard() {
    var container = document.getElementById("tiktok-pipeline-card-container");
    if (!container) return;

    container.replaceChildren();

    var card = document.createElement("article");
    card.className =
      "p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6 transition hover:border-indigo-400";

    var leftDiv = document.createElement("div");
    leftDiv.className = "space-y-3 max-w-3xl";

    var badgeRow = document.createElement("div");
    badgeRow.className = "flex items-center gap-2 flex-wrap";

    var autoBadge = document.createElement("span");
    autoBadge.className =
      "px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider";
    autoBadge.textContent = "Automação $0-OpEx";

    var tkBadge = document.createElement("span");
    tkBadge.className =
      "px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-wider";
    tkBadge.textContent = "TikTok & TikTok Shop Brasil";

    var safeBadge = document.createElement("span");
    safeBadge.className =
      "px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider";
    safeBadge.textContent = "Safe Zone 9:16 + AIGC";

    badgeRow.appendChild(autoBadge);
    badgeRow.appendChild(tkBadge);
    badgeRow.appendChild(safeBadge);

    var titleEl = document.createElement("h3");
    titleEl.className = "text-lg font-extrabold text-white leading-snug";
    titleEl.textContent = "Pipeline de Vídeos 9:16 & Fila de Revisão Human-in-the-Loop";

    var descEl = document.createElement("p");
    descEl.className = "text-xs sm:text-sm text-slate-300 leading-relaxed";
    descEl.textContent =
      "Motor de geração de vídeos verticais 1080x1920 100% originais via código (Pillow + FFmpeg), com Safe Zone TikTok (y: 220-1580px, dir: 190px), rotulagem mandatória AIGC, roteiro PAS anti-shadowban e painel de validação side-by-side com referências de concorrentes catalogados.";

    var featureRow = document.createElement("div");
    featureRow.className = "flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1";

    var f1 = document.createElement("span");
    f1.textContent = "✓ 3 Nichos Homologados";
    var f2 = document.createElement("span");
    f2.textContent = "✓ Trilha Dupla: Shop + Pix D+0";
    var f3 = document.createElement("span");
    f3.textContent = "✓ 100% Pure DOM (Rust Rigor)";

    featureRow.appendChild(f1);
    featureRow.appendChild(f2);
    featureRow.appendChild(f3);

    leftDiv.appendChild(badgeRow);
    leftDiv.appendChild(titleEl);
    leftDiv.appendChild(descEl);
    leftDiv.appendChild(featureRow);

    var rightDiv = document.createElement("div");
    rightDiv.className = "flex flex-col sm:flex-row md:flex-col gap-2.5 flex-shrink-0";

    var openQueueBtn = document.createElement("a");
    openQueueBtn.href = "../tiktok_shop_pipeline/review_queue/index.html";
    openQueueBtn.className =
      "py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold text-center transition shadow-sm flex items-center justify-center gap-2";
    openQueueBtn.textContent = "Abrir Fila de Revisão ↗";

    var copyQueueBtn = document.createElement("button");
    copyQueueBtn.type = "button";
    copyQueueBtn.className =
      "py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold text-center transition border border-slate-700";
    copyQueueBtn.textContent = "Copiar Link da Fila";
    copyQueueBtn.addEventListener("click", function () {
      var fullUrl = new URL("../tiktok_shop_pipeline/review_queue/index.html", window.location.href).href;
      copyText(fullUrl, "Link da Fila de Revisão copiado!");
    });

    rightDiv.appendChild(openQueueBtn);
    rightDiv.appendChild(copyQueueBtn);

    card.appendChild(leftDiv);
    card.appendChild(rightDiv);
    container.appendChild(card);
  }

  // Create Single Offer Card
  function createOfferCard(offer) {
    var card = document.createElement("article");
    card.className = "p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between gap-4 transition hover:border-slate-300 dark:hover:border-slate-700";

    var top = document.createElement("div");
    top.className = "space-y-2.5";

    // Row: TXID + Price
    var metaRow = document.createElement("div");
    metaRow.className = "flex items-center justify-between gap-2";

    var txBadge = document.createElement("span");
    txBadge.className = "px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono-code font-bold border border-slate-200 dark:border-slate-700";
    txBadge.textContent = offer.txid;

    var priceBadge = document.createElement("span");
    priceBadge.className = "text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tabular-nums";
    priceBadge.textContent = formatBRL(offer.price);

    metaRow.appendChild(txBadge);
    metaRow.appendChild(priceBadge);

    // Title & Audience
    var titleEl = document.createElement("h3");
    titleEl.className = "text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug";
    titleEl.textContent = offer.title;

    var audienceEl = document.createElement("p");
    audienceEl.className = "text-xs text-slate-600 dark:text-slate-400 leading-relaxed";
    audienceEl.textContent = "Público: " + offer.audience;

    top.appendChild(metaRow);
    top.appendChild(titleEl);
    top.appendChild(audienceEl);

    // Actions
    var actions = document.createElement("div");
    actions.className = "pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-wrap items-center gap-2";

    var openBtn = document.createElement("a");
    openBtn.href = offer.path;
    openBtn.className = "flex-1 min-w-[120px] text-center py-2 px-3 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-sm";
    openBtn.textContent = "Abrir Página";

    var copyLinkBtn = document.createElement("button");
    copyLinkBtn.type = "button";
    copyLinkBtn.className = "py-2 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition border border-slate-200 dark:border-slate-700/60";
    copyLinkBtn.textContent = "Copiar Link";
    copyLinkBtn.addEventListener("click", function () {
      var fullUrl = new URL(offer.path, window.location.href).href;
      copyText(fullUrl, "Link copiado (" + offer.txid + ")!");
    });

    var copyPitchBtn = document.createElement("button");
    copyPitchBtn.type = "button";
    copyPitchBtn.className = "py-2 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition border border-emerald-200 dark:border-emerald-800/60";
    copyPitchBtn.textContent = "Pitch WhatsApp";
    copyPitchBtn.addEventListener("click", function () {
      var waUrl = buildWhatsAppShareUrl(offer);
      copyText(waUrl, "Pitch WhatsApp (" + offer.txid + ") copiado!");
    });

    actions.appendChild(openBtn);
    actions.appendChild(copyLinkBtn);
    actions.appendChild(copyPitchBtn);

    card.appendChild(top);
    card.appendChild(actions);
    return card;
  }

  // Render Catalog with Filters
  function renderOffers() {
    var grid = document.getElementById("offers-grid");
    var searchInput = document.getElementById("offer-search-input");
    var catSelect = document.getElementById("offer-category-select");
    var countBadge = document.getElementById("offers-count-badge");

    if (!grid) return;

    var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var category = catSelect ? catSelect.value : "all";

    var filtered = OFFERS.filter(function (offer) {
      var matchesCat = category === "all" || offer.category === category;
      if (!matchesCat) return false;

      if (!query) return true;

      var blob = (
        offer.txid + " " +
        offer.title + " " +
        offer.audience + " " +
        offer.keywords + " " +
        offer.path
      ).toLowerCase();

      return blob.indexOf(query) !== -1;
    });

    grid.replaceChildren();

    if (countBadge) {
      countBadge.textContent = filtered.length + " Oferta" + (filtered.length === 1 ? "" : "s");
    }

    if (filtered.length === 0) {
      var emptyMsg = document.createElement("div");
      emptyMsg.className = "col-span-full py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800";
      emptyMsg.textContent = "Nenhuma oferta encontrada com os critérios informados.";
      grid.appendChild(emptyMsg);
      return;
    }

    filtered.forEach(function (offer) {
      grid.appendChild(createOfferCard(offer));
    });
  }

  // Action Plan Checklist (localStorage persisted)
  function getChecklistState() {
    try {
      var raw = localStorage.getItem(STORAGE_CHECKLIST_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function saveChecklistState(state) {
    try {
      localStorage.setItem(STORAGE_CHECKLIST_KEY, JSON.stringify(state));
    } catch (_e) {
      showToast("Aviso: Limite de armazenamento local excedido.");
    }
  }

  function renderActionChecklist() {
    var container = document.getElementById("action-checklist-container");
    var badge = document.getElementById("checklist-progress-badge");
    if (!container) return;

    var state = getChecklistState();
    var completedCount = 0;

    container.replaceChildren();

    CHECKLIST_ITEMS.forEach(function (item) {
      var isChecked = !!state[item.id];
      if (isChecked) completedCount++;

      var row = document.createElement("label");
      row.className = "flex items-start gap-3 p-2.5 rounded-xl transition cursor-pointer " +
        (isChecked ? "bg-slate-50 dark:bg-slate-800/30 opacity-75" : "hover:bg-slate-50 dark:hover:bg-slate-800/40");

      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer";
      cb.checked = isChecked;

      var span = document.createElement("span");
      span.className = "text-xs font-medium " +
        (isChecked ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200");
      span.textContent = item.text;

      cb.addEventListener("change", function () {
        var curState = getChecklistState();
        curState[item.id] = cb.checked;
        saveChecklistState(curState);
        renderActionChecklist();
      });

      row.appendChild(cb);
      row.appendChild(span);
      container.appendChild(row);
    });

    if (badge) {
      badge.textContent = completedCount + " de " + CHECKLIST_ITEMS.length + " concluídas";
      if (completedCount === CHECKLIST_ITEMS.length) {
        badge.className = "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-sm";
      } else {
        badge.className = "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60";
      }
    }
  }

  // Render Organic Pitches (LT01, LT02, LT08)
  function renderPitches() {
    var grid = document.getElementById("pitches-grid");
    if (!grid) return;

    grid.replaceChildren();

    PITCHES.forEach(function (pitch) {
      var card = document.createElement("article");
      card.className = "p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between gap-4";

      var top = document.createElement("div");
      top.className = "space-y-3";

      // Meta: TXID & Price
      var metaRow = document.createElement("div");
      metaRow.className = "flex items-center justify-between gap-2";

      var txBadge = document.createElement("span");
      txBadge.className = "px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-mono-code font-bold border border-indigo-200 dark:border-indigo-800/60";
      txBadge.textContent = pitch.txid;

      var priceBadge = document.createElement("span");
      priceBadge.className = "text-base font-extrabold text-slate-900 dark:text-white tabular-nums";
      priceBadge.textContent = formatBRL(pitch.price);

      metaRow.appendChild(txBadge);
      metaRow.appendChild(priceBadge);

      var titleEl = document.createElement("h4");
      titleEl.className = "text-sm font-bold text-slate-900 dark:text-white leading-snug";
      titleEl.textContent = pitch.title;

      var audienceEl = document.createElement("p");
      audienceEl.className = "text-[11px] text-slate-500 dark:text-slate-400";
      audienceEl.textContent = "Público: " + pitch.audience;

      top.appendChild(metaRow);
      top.appendChild(titleEl);
      top.appendChild(audienceEl);

      // Pitch Boxes
      var pitchesBox = document.createElement("div");
      pitchesBox.className = "space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/60";

      // WhatsApp Pitch Box
      var waDiv = document.createElement("div");
      waDiv.className = "p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2";

      var waHeader = document.createElement("div");
      waHeader.className = "flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400";
      var waLabel = document.createElement("span");
      waLabel.textContent = "Mensagem WhatsApp / Direct";
      waHeader.appendChild(waLabel);

      var waText = document.createElement("p");
      waText.className = "text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3 hover:line-clamp-none transition-all";
      waText.textContent = pitch.waPitch;

      var waCopyBtn = document.createElement("button");
      waCopyBtn.type = "button";
      waCopyBtn.className = "w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm";
      var waIcon = document.createElement("span");
      waIcon.textContent = "Copiar Pitch WhatsApp";
      waCopyBtn.appendChild(waIcon);
      waCopyBtn.addEventListener("click", function () {
        copyText(pitch.waPitch, "Pitch WhatsApp (" + pitch.txid + ") copiado!");
      });

      waDiv.appendChild(waHeader);
      waDiv.appendChild(waText);
      waDiv.appendChild(waCopyBtn);

      // Reels/Shorts Script Box
      var reelsDiv = document.createElement("div");
      reelsDiv.className = "p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2";

      var reelsHeader = document.createElement("div");
      reelsHeader.className = "flex items-center justify-between text-[11px] font-bold text-indigo-700 dark:text-indigo-400";
      var reelsLabel = document.createElement("span");
      reelsLabel.textContent = "Roteiro Reels / Shorts (Hook)";
      reelsHeader.appendChild(reelsLabel);

      var reelsText = document.createElement("p");
      reelsText.className = "text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-sans line-clamp-3 hover:line-clamp-none transition-all";
      reelsText.textContent = pitch.reelsPitch;

      var reelsCopyBtn = document.createElement("button");
      reelsCopyBtn.type = "button";
      reelsCopyBtn.className = "w-full py-1.5 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm";
      var reelsIcon = document.createElement("span");
      reelsIcon.textContent = "Copiar Roteiro Reels";
      reelsCopyBtn.appendChild(reelsIcon);
      reelsCopyBtn.addEventListener("click", function () {
        copyText(pitch.reelsPitch, "Roteiro Reels (" + pitch.txid + ") copiado!");
      });

      reelsDiv.appendChild(reelsHeader);
      reelsDiv.appendChild(reelsText);
      reelsDiv.appendChild(reelsCopyBtn);

      pitchesBox.appendChild(waDiv);
      pitchesBox.appendChild(reelsDiv);

      // Footer: Open Page Link
      var footLink = document.createElement("a");
      footLink.href = pitch.path;
      footLink.className = "text-center py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition border border-slate-200 dark:border-slate-700/60";
      footLink.textContent = "Abrir Página de Vendas";

      card.appendChild(top);
      card.appendChild(pitchesBox);
      card.appendChild(footLink);
      grid.appendChild(card);
    });
  }

  // Render Platform Policies Vault (8 Platforms)
  function renderPolicies() {
    var grid = document.getElementById("policies-grid");
    var searchInput = document.getElementById("policy-search-input");
    var catSelect = document.getElementById("policy-category-select");

    if (!grid) return;

    var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var category = catSelect ? catSelect.value : "all";

    var filtered = PLATFORMS_VAULT.filter(function (p) {
      var matchesCat = category === "all" || p.category.toLowerCase().indexOf(category.toLowerCase()) !== -1;
      if (!matchesCat) return false;

      if (!query) return true;

      var blob = (
        p.id + " " +
        p.name + " " +
        p.category + " " +
        p.risk_level + " " +
        p.ban_triggers.join(" ") + " " +
        p.mandatory_controls.join(" ") + " " +
        p.roi_best_practices.join(" ")
      ).toLowerCase();

      return blob.indexOf(query) !== -1;
    });

    grid.replaceChildren();

    if (filtered.length === 0) {
      var emptyMsg = document.createElement("div");
      emptyMsg.className = "col-span-full py-8 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800";
      emptyMsg.textContent = "Nenhuma política encontrada com os critérios informados.";
      grid.appendChild(emptyMsg);
      return;
    }

    filtered.forEach(function (platform) {
      var card = document.createElement("article");
      card.className = "p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between gap-4 transition hover:border-slate-300 dark:hover:border-slate-700";

      var topDiv = document.createElement("div");
      topDiv.className = "space-y-3";

      // Meta: Category & Risk Level
      var metaRow = document.createElement("div");
      metaRow.className = "flex items-center justify-between gap-2";

      var catBadge = document.createElement("span");
      catBadge.className = "text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider";
      catBadge.textContent = platform.category;

      var riskBadge = document.createElement("span");
      var riskColorClass = "bg-slate-600";
      if (platform.risk_level === "CRITICAL") {
        riskColorClass = "bg-rose-600";
      } else if (platform.risk_level === "HIGH") {
        riskColorClass = "bg-amber-600";
      } else if (platform.risk_level === "MEDIUM") {
        riskColorClass = "bg-indigo-600";
      } else if (platform.risk_level === "LOW") {
        riskColorClass = "bg-emerald-600";
      }
      riskBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm " + riskColorClass;
      riskBadge.textContent = platform.risk_level;

      metaRow.appendChild(catBadge);
      metaRow.appendChild(riskBadge);

      // Title & ID
      var titleEl = document.createElement("h3");
      titleEl.className = "text-base font-bold text-slate-900 dark:text-white leading-snug";
      titleEl.textContent = platform.name;

      var subRow = document.createElement("div");
      subRow.className = "flex items-center justify-between text-xs text-slate-500 dark:text-slate-400";

      var idCode = document.createElement("code");
      idCode.className = "font-mono-code font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
      idCode.textContent = platform.id;

      var dateSpan = document.createElement("span");
      dateSpan.textContent = "Auditado: " + platform.last_verified;

      subRow.appendChild(idCode);
      subRow.appendChild(dateSpan);

      topDiv.appendChild(metaRow);
      topDiv.appendChild(titleEl);
      topDiv.appendChild(subRow);

      // Sections: Ban Triggers, Mandatory Controls, ROI Best Practices
      var sectionsDiv = document.createElement("div");
      sectionsDiv.className = "space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60";

      // 1. Ban Triggers
      var triggersBox = document.createElement("div");
      triggersBox.className = "space-y-1.5";
      var triggersHead = document.createElement("h4");
      triggersHead.className = "text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1.5";
      var tIcon = document.createElement("span");
      tIcon.textContent = "⚠️ Gatilhos de Bloqueio (Ban Triggers)";
      triggersHead.appendChild(tIcon);

      var triggersList = document.createElement("ul");
      triggersList.className = "list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed";
      platform.ban_triggers.forEach(function (trigger) {
        var li = document.createElement("li");
        li.textContent = trigger;
        triggersList.appendChild(li);
      });
      triggersBox.appendChild(triggersHead);
      triggersBox.appendChild(triggersList);

      // 2. Mandatory Controls
      var controlsBox = document.createElement("div");
      controlsBox.className = "space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40";
      var controlsHead = document.createElement("h4");
      controlsHead.className = "text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-1.5";
      var cIcon = document.createElement("span");
      cIcon.textContent = "🛡️ Controles Mandatórios";
      controlsHead.appendChild(cIcon);

      var controlsList = document.createElement("ul");
      controlsList.className = "list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed";
      platform.mandatory_controls.forEach(function (ctrl) {
        var li = document.createElement("li");
        li.textContent = ctrl;
        controlsList.appendChild(li);
      });
      controlsBox.appendChild(controlsHead);
      controlsBox.appendChild(controlsList);

      // 3. ROI Best Practices
      var roiBox = document.createElement("div");
      roiBox.className = "space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/40";
      var roiHead = document.createElement("h4");
      roiHead.className = "text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1.5";
      var rIcon = document.createElement("span");
      rIcon.textContent = "📈 Boas Práticas de ROI";
      roiHead.appendChild(rIcon);

      var roiList = document.createElement("ul");
      roiList.className = "list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed";
      platform.roi_best_practices.forEach(function (practice) {
        var li = document.createElement("li");
        li.textContent = practice;
        roiList.appendChild(li);
      });
      roiBox.appendChild(roiHead);
      roiBox.appendChild(roiList);

      sectionsDiv.appendChild(triggersBox);
      sectionsDiv.appendChild(controlsBox);
      sectionsDiv.appendChild(roiBox);

      // Footer: Official Link
      var footDiv = document.createElement("div");
      footDiv.className = "pt-3 border-t border-slate-100 dark:border-slate-800/60";

      var docLink = document.createElement("a");
      docLink.href = platform.official_url;
      docLink.target = "_blank";
      docLink.rel = "noopener noreferrer";
      docLink.className = "w-full py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-semibold text-center transition border border-slate-200 dark:border-slate-700/60 flex items-center justify-center gap-1.5";

      var docText = document.createElement("span");
      docText.textContent = "Ver Documentação Oficial da Plataforma";
      var docExt = document.createElement("span");
      docExt.textContent = "↗";

      docLink.appendChild(docText);
      docLink.appendChild(docExt);
      footDiv.appendChild(docLink);

      card.appendChild(topDiv);
      card.appendChild(sectionsDiv);
      card.appendChild(footDiv);
      grid.appendChild(card);
    });
  }

  // Pix Ledger (Local Storage)
  function getLedger() {
    try {
      var raw = localStorage.getItem(STORAGE_LEDGER_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_e) {
      return [];
    }
  }

  function saveLedger(entries) {
    try {
      localStorage.setItem(STORAGE_LEDGER_KEY, JSON.stringify(entries));
    } catch (_e) {
      showToast("Aviso: Limite de armazenamento local excedido.");
    }
  }

  function renderLedger() {
    var tbody = document.getElementById("ledger-table-body");
    var totalEl = document.getElementById("ledger-total-value");
    var kpiReceitaLive = document.getElementById("kpi-receita-live");

    if (!tbody) return;

    var entries = getLedger();
    var sum = 0;

    tbody.replaceChildren();

    if (entries.length === 0) {
      var emptyRow = document.createElement("tr");
      var emptyCell = document.createElement("td");
      emptyCell.colSpan = 5;
      emptyCell.className = "py-6 text-center text-slate-400 dark:text-slate-500 text-xs";
      emptyCell.textContent = "Nenhum lançamento registrado no momento. Anote acima os Pix confirmados em vudotsur@gmail.com.";
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      entries.forEach(function (entry, index) {
        sum += Number(entry.amount) || 0;

        var tr = document.createElement("tr");
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition";

        // Date
        var tdDate = document.createElement("td");
        tdDate.className = "py-2.5 px-3 font-mono-code text-slate-600 dark:text-slate-300";
        tdDate.textContent = entry.date || "-";

        // Offer
        var tdOffer = document.createElement("td");
        tdOffer.className = "py-2.5 px-3 font-semibold text-slate-900 dark:text-white";
        tdOffer.textContent = entry.offer || "-";

        // Amount
        var tdAmount = document.createElement("td");
        tdAmount.className = "py-2.5 px-3 font-mono-code font-bold text-emerald-600 dark:text-emerald-400 tabular-nums";
        tdAmount.textContent = formatBRL(entry.amount);

        // Notes
        var tdNotes = document.createElement("td");
        tdNotes.className = "py-2.5 px-3 text-slate-500 dark:text-slate-400 truncate max-w-[180px]";
        tdNotes.textContent = entry.notes || "-";

        // Action (Delete)
        var tdAction = document.createElement("td");
        tdAction.className = "py-2.5 px-3 text-right";

        var delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "text-rose-600 dark:text-rose-400 hover:text-rose-700 text-xs font-medium";
        delBtn.textContent = "Excluir";
        delBtn.addEventListener("click", function () {
          deleteLedgerEntry(index);
        });

        tdAction.appendChild(delBtn);

        tr.appendChild(tdDate);
        tr.appendChild(tdOffer);
        tr.appendChild(tdAmount);
        tr.appendChild(tdNotes);
        tr.appendChild(tdAction);

        tbody.appendChild(tr);
      });
    }

    if (totalEl) {
      totalEl.textContent = formatBRL(sum);
    }

    if (kpiReceitaLive) {
      kpiReceitaLive.textContent = formatBRL(sum);
    }
  }

  function addLedgerEntry(date, amount, offer, notes) {
    var entries = getLedger();
    entries.unshift({
      id: Date.now(),
      date: date,
      amount: Number(amount) || 0,
      offer: offer,
      notes: notes
    });
    saveLedger(entries);
    renderLedger();
    showToast("Lançamento Pix de " + formatBRL(amount) + " salvo localmente!");
  }

  function deleteLedgerEntry(index) {
    var entries = getLedger();
    if (index >= 0 && index < entries.length) {
      entries.splice(index, 1);
      saveLedger(entries);
      renderLedger();
      showToast("Lançamento removido.");
    }
  }

  function clearAllLedger() {
    if (confirm("Deseja realmente limpar todos os registros de receita salvos localmente?")) {
      saveLedger([]);
      renderLedger();
      showToast("Todos os registros locais foram limpos.");
    }
  }

  // Setup Commands and Action Buttons
  function setupActionListeners() {
    // Pix Copy Buttons
    var copyPixHandlers = [
      "sidebar-copy-pix",
      "topbar-copy-pix",
      "card-copy-pix",
      "section-copy-pix"
    ];

    copyPixHandlers.forEach(function (btnId) {
      var btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener("click", function () {
          copyText(PIX_KEY, "Chave Pix copiada: " + PIX_KEY);
        });
      }
    });

    // Polar.sh link copy
    var polarCopyBtn = document.getElementById("copy-polar-link");
    if (polarCopyBtn) {
      polarCopyBtn.addEventListener("click", function () {
        copyText("https://polar.sh/dashboard", "Link do painel Polar.sh copiado!");
      });
    }

    // Cloudflare Bundle & Deploy Copy Buttons
    var cmdBundleBtn = document.getElementById("cmd-copy-bundle");
    if (cmdBundleBtn) {
      cmdBundleBtn.addEventListener("click", function () {
        copyText("python scripts/build_cloudflare_bundle.py", "Comando de build copiado!");
      });
    }

    var cmdDeployCfBtn = document.getElementById("cmd-copy-deploy-cf");
    if (cmdDeployCfBtn) {
      cmdDeployCfBtn.addEventListener("click", function () {
        copyText("npx wrangler pages deploy dist_cloudflare --project-name=vitrine-brasil", "Comando Cloudflare deploy copiado!");
      });
    }

    // Reset Checklist Button
    var resetChecklistBtn = document.getElementById("reset-checklist-btn");
    if (resetChecklistBtn) {
      resetChecklistBtn.addEventListener("click", function () {
        saveChecklistState({});
        renderActionChecklist();
        showToast("Checklist reiniciado.");
      });
    }

    // Policies Filter Listeners
    var policySearchInput = document.getElementById("policy-search-input");
    if (policySearchInput) {
      policySearchInput.addEventListener("input", renderPolicies);
    }

    var policyCatSelect = document.getElementById("policy-category-select");
    if (policyCatSelect) {
      policyCatSelect.addEventListener("change", renderPolicies);
    }

    // CLI Commands Copy
    var cmdTests = document.getElementById("cmd-copy-tests");
    if (cmdTests) {
      cmdTests.addEventListener("click", function () {
        copyText("python -m unittest discover -s tests", "Comando de testes copiado!");
      });
    }

    var cmdShield = document.getElementById("cmd-copy-shield");
    if (cmdShield) {
      cmdShield.addEventListener("click", function () {
        copyText("python .gemini/skills/phd-ban-shield-qa-guard/scripts/verify_shield.py", "Comando Ban Shield copiado!");
      });
    }

    var cmdSync = document.getElementById("cmd-copy-sync");
    if (cmdSync) {
      cmdSync.addEventListener("click", function () {
        copyText('powershell -ExecutionPolicy Bypass -File .gemini/scripts/sync-github.ps1 "sync"', "Comando Git Sync copiado!");
      });
    }

    // Filter Listeners for Offers
    var searchInput = document.getElementById("offer-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", renderOffers);
    }

    var catSelect = document.getElementById("offer-category-select");
    if (catSelect) {
      catSelect.addEventListener("change", renderOffers);
    }

    // Ledger Form Submit
    var ledgerForm = document.getElementById("pix-ledger-form");
    if (ledgerForm) {
      var dateInput = document.getElementById("ledger-date");
      if (dateInput) {
        var today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
      }

      ledgerForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var dateVal = (document.getElementById("ledger-date") || {}).value;
        var amtVal = (document.getElementById("ledger-amount") || {}).value;
        var offerVal = (document.getElementById("ledger-offer") || {}).value;
        var notesVal = (document.getElementById("ledger-notes") || {}).value;

        if (!amtVal || Number(amtVal) <= 0) {
          showToast("Informe um valor válido maior que zero.");
          return;
        }

        addLedgerEntry(dateVal, amtVal, offerVal, notesVal);

        var amtInput = document.getElementById("ledger-amount");
        var notesInput = document.getElementById("ledger-notes");
        if (amtInput) amtInput.value = "";
        if (notesInput) notesInput.value = "";
      });
    }

    // Clear Ledger Button
    var clearLedgerBtn = document.getElementById("clear-ledger-btn");
    if (clearLedgerBtn) {
      clearLedgerBtn.addEventListener("click", clearAllLedger);
    }

    // Mobile Menu Toggle
    var menuToggle = document.getElementById("mobile-menu-toggle");
    var sidebarNav = document.getElementById("sidebar-nav");
    if (menuToggle && sidebarNav) {
      menuToggle.addEventListener("click", function () {
        sidebarNav.classList.toggle("hidden");
      });
    }
  }

  // Initialization
  function init() {
    initTheme();
    renderHubs();
    renderTikTokPipelineCard();
    renderOffers();
    renderActionChecklist();
    renderPitches();
    renderPolicies();
    renderLedger();
    setupActionListeners();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
