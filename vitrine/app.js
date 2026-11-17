(function () {
  "use strict";

  const PIX_KEY = "vudotsur@gmail.com";
  const MERCHANT_NAME = "VUDOTSUR";
  const MERCHANT_CITY = "LONDRINA";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const IBGE_MUNICIPIOS_ENDPOINT = "https://servicodados.ibge.gov.br/api/v1/localidades/estados/{UF}/municipios";

  const UF_DATA = {
    AC: { name: "Acre", region: "Norte" },
    AL: { name: "Alagoas", region: "Nordeste" },
    AP: { name: "Amapá", region: "Norte" },
    AM: { name: "Amazonas", region: "Norte" },
    BA: { name: "Bahia", region: "Nordeste" },
    CE: { name: "Ceará", region: "Nordeste" },
    DF: { name: "Distrito Federal", region: "Centro-Oeste" },
    ES: { name: "Espírito Santo", region: "Sudeste" },
    GO: { name: "Goiás", region: "Centro-Oeste" },
    MA: { name: "Maranhão", region: "Nordeste" },
    MT: { name: "Mato Grosso", region: "Centro-Oeste" },
    MS: { name: "Mato Grosso do Sul", region: "Centro-Oeste" },
    MG: { name: "Minas Gerais", region: "Sudeste" },
    PA: { name: "Pará", region: "Norte" },
    PB: { name: "Paraíba", region: "Nordeste" },
    PR: { name: "Paraná", region: "Sul" },
    PE: { name: "Pernambuco", region: "Nordeste" },
    PI: { name: "Piauí", region: "Nordeste" },
    RJ: { name: "Rio de Janeiro", region: "Sudeste" },
    RN: { name: "Rio Grande do Norte", region: "Nordeste" },
    RS: { name: "Rio Grande do Sul", region: "Sul" },
    RO: { name: "Rondônia", region: "Norte" },
    RR: { name: "Roraima", region: "Norte" },
    SC: { name: "Santa Catarina", region: "Sul" },
    SP: { name: "São Paulo", region: "Sudeste" },
    SE: { name: "Sergipe", region: "Nordeste" },
    TO: { name: "Tocantins", region: "Norte" }
  };

  const REGION_CONTEXT = {
    "Sul": "Região Sul • IPCA regional, frete rodoviário BR-116/376 e cesta básica • IBGE, BCB & Querido Diário",
    "Sudeste": "Região Sudeste • IPCA metropolitano, custo de serviços e editais • IBGE, BCB & Querido Diário",
    "Centro-Oeste": "Região Centro-Oeste • Agronegócio, frete graneleiro e IPCA regional • IBGE, BCB & Querido Diário",
    "Nordeste": "Região Nordeste • IPCA regional, frete cabotagem/rodoviário e editais • IBGE, BCB & Querido Diário",
    "Norte": "Região Norte • Logística amazônica, frete fluvial/aéreo e IPCA regional • IBGE, BCB & Querido Diário"
  };

  const FALLBACK_CITIES_BY_UF = {
    AC: [{ id: "1200401", nome: "Rio Branco" }, { id: "1200203", nome: "Cruzeiro do Sul" }],
    AL: [{ id: "2704302", nome: "Maceió" }, { id: "2700300", nome: "Arapiraca" }],
    AP: [{ id: "1600303", nome: "Macapá" }, { id: "1600600", nome: "Santana" }],
    AM: [{ id: "1302603", nome: "Manaus" }, { id: "1303403", nome: "Parintins" }],
    BA: [{ id: "2927408", nome: "Salvador" }, { id: "2910800", nome: "Feira de Santana" }, { id: "2933307", nome: "Vitória da Conquista" }],
    CE: [{ id: "2304400", nome: "Fortaleza" }, { id: "2307304", nome: "Juazeiro do Norte" }, { id: "2312908", nome: "Sobral" }],
    DF: [{ id: "5300108", nome: "Brasília" }],
    ES: [{ id: "3205309", nome: "Vitória" }, { id: "3205200", nome: "Vila Velha" }, { id: "3205002", nome: "Serra" }],
    GO: [{ id: "5208707", nome: "Goiânia" }, { id: "5201405", nome: "Aparecida de Goiânia" }, { id: "5201108", nome: "Anápolis" }],
    MA: [{ id: "2111300", nome: "São Luís" }, { id: "2105302", nome: "Imperatriz" }],
    MT: [{ id: "5103403", nome: "Cuiabá" }, { id: "5108402", nome: "Várzea Grande" }, { id: "5107602", nome: "Rondonópolis" }],
    MS: [{ id: "5002704", nome: "Campo Grande" }, { id: "5003702", nome: "Dourados" }],
    MG: [{ id: "3106200", nome: "Belo Horizonte" }, { id: "3170206", nome: "Uberlândia" }, { id: "3136702", nome: "Juiz de Fora" }],
    PA: [{ id: "1501402", nome: "Belém" }, { id: "1500800", nome: "Ananindeua" }, { id: "1506807", nome: "Santarém" }],
    PB: [{ id: "2507507", nome: "João Pessoa" }, { id: "2504009", nome: "Campina Grande" }],
    PR: [{ id: "4113700", nome: "Londrina" }, { id: "4106902", nome: "Curitiba" }, { id: "4115200", nome: "Maringá" }, { id: "4119905", nome: "Ponta Grossa" }, { id: "4104808", nome: "Cascavel" }],
    PE: [{ id: "2611606", nome: "Recife" }, { id: "2607901", nome: "Jaboatão dos Guararapes" }, { id: "2604106", nome: "Caruaru" }],
    PI: [{ id: "2211001", nome: "Teresina" }, { id: "2207702", nome: "Parnaíba" }],
    RJ: [{ id: "3304557", nome: "Rio de Janeiro" }, { id: "3304904", nome: "São Gonçalo" }, { id: "3303302", nome: "Niterói" }],
    RN: [{ id: "2408102", nome: "Natal" }, { id: "2408003", nome: "Mossoró" }],
    RS: [{ id: "4314902", nome: "Porto Alegre" }, { id: "4305108", nome: "Caxias do Sul" }, { id: "4314407", nome: "Pelotas" }],
    RO: [{ id: "1100205", nome: "Porto Velho" }, { id: "1100122", nome: "Ji-Paraná" }],
    RR: [{ id: "1400100", nome: "Boa Vista" }],
    SC: [{ id: "4205407", nome: "Florianópolis" }, { id: "4209102", nome: "Joinville" }, { id: "4202404", nome: "Blumenau" }],
    SP: [{ id: "3550308", nome: "São Paulo" }, { id: "3509502", nome: "Campinas" }, { id: "3543402", nome: "Ribeirão Preto" }, { id: "3549904", nome: "São José dos Campos" }],
    SE: [{ id: "2800308", nome: "Aracaju" }],
    TO: [{ id: "1721000", nome: "Palmas" }, { id: "1702109", nome: "Araguaína" }]
  };

  const CHECKOUT_ITEMS = {
    BUNDLE5: {
      id: "BUNDLE5",
      title: "Pacote Completo Dia a Dia (5 Ferramentas)",
      price: 39.90,
      txid: "BUNDLE5",
      badge: "41% OFF",
      href: "../portfolio/poc_1_bolso_mercado/index.html"
    },
    ALLACCESS: {
      id: "ALLACCESS",
      title: "Kit de Automação e Economia de IA",
      price: 99.00,
      txid: "ALLACCESS",
      badge: "EMPRESAS & DEVS",
      href: "../product/index.html"
    },
    B2B: {
      id: "B2B",
      title: "Monitoramento Personalizado para sua Cidade",
      price: 197.00,
      txid: "B2B",
      badge: "MONITORAMENTO LOCAL",
      href: "../preproject/web/index.html"
    }
  };

  const CATALOG_ITEMS = [
    {
      id: "POC01",
      title: "Radar de Preços do Mercado e Combustível",
      subtitle: "Não sabe se o mercado ou o posto subiram além da conta? Compare a inflação real da sua cesta básica, gasolina e conta de luz em segundos.",
      sources: "Para Sua Casa & Compras",
      price: 9.90,
      txid: "POC01",
      href: "../portfolio/poc_1_bolso_mercado/index.html",
      audiences: ["Casa & Compras"],
      tag: "Casa & Compras",
      ctaLabel: "Quero economizar no mercado — R$ 9,90"
    },
    {
      id: "POC03",
      title: "Detector de Falso Desconto",
      subtitle: "Cansado de cair em promoção 'metade do dobro'? Descubra se o preço está barato mesmo e se vale mais pagar no Pix ou parcelar.",
      sources: "Para Sua Casa & Compras",
      price: 9.90,
      txid: "POC03",
      href: "../portfolio/poc_3_hora_certa_comprar/index.html",
      audiences: ["Casa & Compras"],
      tag: "Casa & Compras",
      ctaLabel: "Quero checar promoções — R$ 9,90"
    },
    {
      id: "POC04",
      title: "Calculadora Real: CLT ou PJ?",
      subtitle: "Medo de trocar de emprego ou abrir CNPJ e sobrar menos no fim do mês? Veja o valor líquido real descontando INSS, IR e impostos no centavo.",
      sources: "Para Trabalho & Concursos",
      price: 19.90,
      txid: "POC04",
      href: "../portfolio/poc_4_bussola_clt_pj_bolsa/index.html",
      audiences: ["Trabalho & Concursos"],
      tag: "Trabalho & Concursos",
      ctaLabel: "Quero calcular meu salário líquido — R$ 19,90"
    },
    {
      id: "POC02",
      title: "Monitor de Concursos e Editais em Londrina",
      dynamicTitlePrefix: "Monitor de Concursos e Editais em ",
      subtitle: "Perdeu prazo de concurso ou nomeação porque não leu o Diário Oficial? Receba alertas diretos de editais e vagas abertas na sua cidade.",
      sources: "Para Trabalho & Concursos",
      price: 14.90,
      txid: "POC02",
      href: "../portfolio/poc_2_lupa_cidade/index.html",
      audiences: ["Trabalho & Concursos"],
      tag: "Trabalho & Concursos",
      ctaLabel: "Quero receber editais da minha cidade — R$ 14,90"
    },
    {
      id: "POC05",
      title: "Corretor Anti-Erro de Referências ABNT",
      subtitle: "A banca pode reprovar seu TCC ou artigo por citação inventada ou fora da norma. Valide seus links reais e formate tudo em ABNT na hora.",
      sources: "Para Faculdade & TCC",
      price: 14.90,
      txid: "POC05",
      href: "../portfolio/poc_5_auditor_abnt_doi/index.html",
      audiences: ["Faculdade & TCC"],
      tag: "Faculdade & TCC",
      ctaLabel: "Quero blindar meu TCC/artigo — R$ 14,90"
    }
  ];

  // Register individual tools in CHECKOUT_ITEMS for unified modal lookup
  CATALOG_ITEMS.forEach(function (item) {
    CHECKOUT_ITEMS[item.id] = {
      id: item.id,
      title: item.title,
      dynamicTitlePrefix: item.dynamicTitlePrefix || "",
      price: item.price,
      txid: item.txid,
      badge: item.tag,
      href: item.href
    };
  });

  // --- EMVCo Pix BR Code Generator ---
  function formatTlv(id, value) {
    const str = String(value);
    const len = String(str.length).padStart(2, "0");
    return id + len + str;
  }

  function computeCrc16Ccitt(payload) {
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let bit = 0; bit < 8; bit++) {
        if ((crc & 0x8000) !== 0) {
          crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
        } else {
          crc = (crc << 1) & 0xFFFF;
        }
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  function generatePixBrCode(pixKey, amount, merchantName, merchantCity, txid) {
    const name = String(merchantName || MERCHANT_NAME)
      .toUpperCase()
      .replace(/[^A-Z0-9 .\-/]/g, "")
      .slice(0, 25) || MERCHANT_NAME;
    const city = String(merchantCity || MERCHANT_CITY)
      .toUpperCase()
      .replace(/[^A-Z0-9 .\-/]/g, "")
      .slice(0, 15) || MERCHANT_CITY;
    const cleanTxid = String(txid || "VITRINE")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 25) || "***";

    const gui = formatTlv("00", "br.gov.bcb.pix");
    const key = formatTlv("01", pixKey);
    const merchantAccount = formatTlv("26", gui + key);
    const txidTlv = formatTlv("62", formatTlv("05", cleanTxid));
    const amountFormatted = Number(amount).toFixed(2);

    const body =
      formatTlv("00", "01") +
      merchantAccount +
      formatTlv("52", "0000") +
      formatTlv("53", "986") +
      formatTlv("54", amountFormatted) +
      formatTlv("58", "BR") +
      formatTlv("59", name) +
      formatTlv("60", city) +
      txidTlv +
      "6304";

    return body + computeCrc16Ccitt(body);
  }

  // --- Pure-JS QR Code Generator (Byte-Mode, Versions 4-8, ECC-L, SVG Path) ---
  const GF_EXP = new Uint8Array(512);
  const GF_LOG = new Uint8Array(256);
  (function initGaloisField() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) {
        x ^= 0x11d;
      }
    }
    for (let i = 255; i < 512; i++) {
      GF_EXP[i] = GF_EXP[i - 255];
    }
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(ecCount) {
    let poly = [1];
    for (let i = 0; i < ecCount; i++) {
      const next = new Array(poly.length + 1).fill(0);
      const factor = GF_EXP[i];
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsComputeRemainder(data, ecCount) {
    const gen = rsGeneratorPoly(ecCount);
    const res = new Uint8Array(data.length + ecCount);
    res.set(data, 0);
    for (let i = 0; i < data.length; i++) {
      const coef = res[i];
      if (coef !== 0) {
        for (let j = 0; j < gen.length; j++) {
          res[i + j] ^= gfMul(gen[j], coef);
        }
      }
    }
    return res.slice(data.length);
  }

  // ISO/IEC 18004 ECC-L specs for Versions 4..8
  const QR_VERSIONS = [
    { version: 4, size: 33, align: [6, 26], blocks: 1, dataPerBlock: 80, ecPerBlock: 20, remBits: 7 },
    { version: 5, size: 37, align: [6, 30], blocks: 1, dataPerBlock: 108, ecPerBlock: 26, remBits: 7 },
    { version: 6, size: 41, align: [6, 34], blocks: 2, dataPerBlock: 68, ecPerBlock: 18, remBits: 7 },
    { version: 7, size: 45, align: [6, 22, 38], blocks: 2, dataPerBlock: 78, ecPerBlock: 20, remBits: 0 },
    { version: 8, size: 49, align: [6, 24, 42], blocks: 2, dataPerBlock: 97, ecPerBlock: 24, remBits: 0 }
  ];

  function encodeQrBytes(text) {
    const utf8 = new TextEncoder().encode(text);
    const totalNeededBits = 4 + 8 + utf8.length * 8 + 4;
    let spec = null;
    for (let i = 0; i < QR_VERSIONS.length; i++) {
      const candidate = QR_VERSIONS[i];
      const capBits = candidate.blocks * candidate.dataPerBlock * 8;
      if (totalNeededBits <= capBits) {
        spec = candidate;
        break;
      }
    }
    if (!spec) {
      spec = QR_VERSIONS[QR_VERSIONS.length - 1];
    }

    const totalDataBytes = spec.blocks * spec.dataPerBlock;
    const bits = [];
    function pushBits(val, len) {
      for (let b = len - 1; b >= 0; b--) {
        bits.push((val >>> b) & 1);
      }
    }

    pushBits(0b0100, 4); // Byte mode
    pushBits(utf8.length, 8);
    for (let i = 0; i < utf8.length; i++) {
      pushBits(utf8[i], 8);
    }
    const maxBits = totalDataBytes * 8;
    const termLen = Math.min(4, maxBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }
    const dataBytes = [];
    for (let i = 0; i < bits.length; i += 8) {
      let byteVal = 0;
      for (let j = 0; j < 8; j++) {
        byteVal = (byteVal << 1) | bits[i + j];
      }
      dataBytes.push(byteVal);
    }
    const padBytes = [0xEC, 0x11];
    let padIdx = 0;
    while (dataBytes.length < totalDataBytes) {
      dataBytes.push(padBytes[padIdx % 2]);
      padIdx++;
    }

    // Split into blocks and compute RS ECC
    const dataBlocks = [];
    const ecBlocks = [];
    for (let b = 0; b < spec.blocks; b++) {
      const start = b * spec.dataPerBlock;
      const block = new Uint8Array(dataBytes.slice(start, start + spec.dataPerBlock));
      dataBlocks.push(block);
      ecBlocks.push(rsComputeRemainder(block, spec.ecPerBlock));
    }

    // Interleave data and EC codewords
    const codewords = [];
    for (let i = 0; i < spec.dataPerBlock; i++) {
      for (let b = 0; b < spec.blocks; b++) {
        codewords.push(dataBlocks[b][i]);
      }
    }
    for (let i = 0; i < spec.ecPerBlock; i++) {
      for (let b = 0; b < spec.blocks; b++) {
        codewords.push(ecBlocks[b][i]);
      }
    }

    const bitStream = [];
    for (let i = 0; i < codewords.length; i++) {
      const cw = codewords[i];
      for (let bit = 7; bit >= 0; bit--) {
        bitStream.push((cw >>> bit) & 1);
      }
    }
    for (let r = 0; r < spec.remBits; r++) {
      bitStream.push(0);
    }

    return { spec: spec, bitStream: bitStream };
  }

  function buildQrMatrix(text) {
    const encoded = encodeQrBytes(text);
    const spec = encoded.spec;
    const size = spec.size;
    const modules = Array.from({ length: size }, function () {
      return new Int8Array(size); // 0 = unset, 1 = dark, -1 = light
    });
    const isFunc = Array.from({ length: size }, function () {
      return new Uint8Array(size);
    });

    function setFunc(r, c, dark) {
      if (r >= 0 && r < size && c >= 0 && c < size) {
        modules[r][c] = dark ? 1 : -1;
        isFunc[r][c] = 1;
      }
    }

    function drawFinder(top, left) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = top + r;
          const cc = left + c;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          const inBox = r >= 0 && r <= 6 && c >= 0 && c <= 6;
          const border = r === 0 || r === 6 || c === 0 || c === 6;
          const center = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          setFunc(rr, cc, inBox && (border || center));
        }
      }
    }

    function drawAlignment(cr, cc) {
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          const dark = Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0);
          setFunc(cr + r, cc + c, dark);
        }
      }
    }

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Alignment patterns
    const coords = spec.align;
    for (let i = 0; i < coords.length; i++) {
      for (let j = 0; j < coords.length; j++) {
        const r = coords[i];
        const c = coords[j];
        if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) {
          continue;
        }
        drawAlignment(r, c);
      }
    }

    // Timing patterns
    for (let i = 8; i < size - 8; i++) {
      const dark = i % 2 === 0;
      if (!isFunc[6][i]) setFunc(6, i, dark);
      if (!isFunc[i][6]) setFunc(i, 6, dark);
    }

    // Dark module
    setFunc(size - 8, 8, true);

    // Reserve format info cells
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        isFunc[8][i] = 1;
        isFunc[i][8] = 1;
      }
    }
    for (let i = 0; i < 8; i++) {
      isFunc[8][size - 1 - i] = 1;
      isFunc[size - 1 - i][8] = 1;
    }

    // Version info for Version >= 7
    if (spec.version >= 7) {
      let rem = spec.version;
      for (let i = 0; i < 12; i++) {
        rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
      }
      const verBits = (spec.version << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const dark = ((verBits >>> i) & 1) === 1;
        const a = Math.floor(i / 3);
        const b = size - 11 + (i % 3);
        setFunc(a, b, dark);
        setFunc(b, a, dark);
      }
    }

    // Place data bits in zig-zag order
    const stream = encoded.bitStream;
    let bitIdx = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let step = 0; step < size; step++) {
        const r = upward ? size - 1 - step : step;
        for (let dx = 0; dx < 2; dx++) {
          const c = right - dx;
          if (!isFunc[r][c]) {
            const bit = bitIdx < stream.length ? stream[bitIdx++] : 0;
            modules[r][c] = bit ? 1 : -1;
          }
        }
      }
      upward = !upward;
    }

    // Mask pattern evaluation (0..7)
    function maskCond(pattern, r, c) {
      switch (pattern) {
        case 0: return (r + c) % 2 === 0;
        case 1: return r % 2 === 0;
        case 2: return c % 3 === 0;
        case 3: return (r + c) % 3 === 0;
        case 4: return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
        case 5: return ((r * c) % 2) + ((r * c) % 3) === 0;
        case 6: return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
        default: return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
      }
    }

    function applyMaskAndScore(pattern) {
      const grid = modules.map(function (row, r) {
        return row.map(function (val, c) {
          if (isFunc[r][c]) return val === 1;
          const invert = maskCond(pattern, r, c);
          return invert ? val !== 1 : val === 1;
        });
      });

      // Penalty 1: consecutive same-color modules in rows/cols
      let penalty = 0;
      for (let r = 0; r < size; r++) {
        let run = 1;
        for (let c = 1; c < size; c++) {
          if (grid[r][c] === grid[r][c - 1]) {
            run++;
            if (run === 5) penalty += 3;
            else if (run > 5) penalty += 1;
          } else {
            run = 1;
          }
        }
      }
      for (let c = 0; c < size; c++) {
        let run = 1;
        for (let r = 1; r < size; r++) {
          if (grid[r][c] === grid[r - 1][c]) {
            run++;
            if (run === 5) penalty += 3;
            else if (run > 5) penalty += 1;
          } else {
            run = 1;
          }
        }
      }
      // Penalty 2: 2x2 blocks
      for (let r = 0; r < size - 1; r++) {
        for (let c = 0; c < size - 1; c++) {
          const v = grid[r][c];
          if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) {
            penalty += 3;
          }
        }
      }
      return { grid: grid, penalty: penalty };
    }

    let bestPattern = 0;
    let bestResult = applyMaskAndScore(0);
    for (let p = 1; p < 8; p++) {
      const candidate = applyMaskAndScore(p);
      if (candidate.penalty < bestResult.penalty) {
        bestPattern = p;
        bestResult = candidate;
      }
    }

    // Write BCH(15, 5) format info for ECC-L (0b01) + bestPattern
    const formatData = (0b01 << 3) | bestPattern;
    let rem = formatData;
    for (let i = 0; i < 10; i++) {
      rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    }
    const formatBits = ((formatData << 10) | rem) ^ 0x5412;

    const finalGrid = bestResult.grid;
    for (let i = 0; i < 15; i++) {
      const dark = ((formatBits >>> i) & 1) === 1;
      if (i < 6) finalGrid[8][i] = dark;
      else if (i < 8) finalGrid[8][i + 1] = dark;
      else finalGrid[8][size - 15 + i] = dark;

      if (i < 8) finalGrid[size - 1 - i][8] = dark;
      else if (i < 9) finalGrid[15 - i][8] = dark;
      else finalGrid[14 - i][8] = dark;
    }

    return finalGrid;
  }

  function renderQrSvg(text) {
    const grid = buildQrMatrix(text);
    const size = grid.length;
    const quiet = 4;
    const total = size + quiet * 2;

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + total + " " + total);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "QR Code Pix");

    const bg = document.createElementNS(SVG_NS, "rect");
    bg.setAttribute("width", String(total));
    bg.setAttribute("height", String(total));
    bg.setAttribute("fill", "#ffffff");
    svg.appendChild(bg);

    const pathParts = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c]) {
          pathParts.push("M" + (c + quiet) + "," + (r + quiet) + "h1v1h-1z");
        }
      }
    }

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathParts.join(""));
    path.setAttribute("fill", "#09090b");
    svg.appendChild(path);

    return svg;
  }

  // --- National City State (IBGE 5,570 Municipalities) ---
  const cityCache = {};
  let currentCity = { uf: "PR", nome: "Londrina", ibge: "4113700" };
  let currentAudience = "Todos";

  const ufSelect = document.getElementById("uf-select");
  const citySearchInput = document.getElementById("city-search");
  const citySelect = document.getElementById("city-select");
  const ibgeStatusBadge = document.getElementById("ibge-status-badge");
  const headerCityBadge = document.getElementById("header-city-badge");
  const regionalContextEl = document.getElementById("regional-context");
  const heroTitleEl = document.getElementById("hero-title");
  const heroSubtitleEl = document.getElementById("hero-subtitle");
  const btnWhatsappShare = document.getElementById("btn-whatsapp-share");
  const bundlesTxidSummary = document.getElementById("bundles-txid-summary");
  const bundle5TxidLabel = document.getElementById("bundle5-txid-label");
  const allaccessTxidLabel = document.getElementById("allaccess-txid-label");
  const b2bTxidLabel = document.getElementById("b2b-txid-label");
  const b2bBundleTitle = document.getElementById("b2b-bundle-title");
  const footerCityEl = document.getElementById("footer-city");

  function normalizeText(str) {
    return String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function sanitizeAsciiCity(cityName) {
    return String(cityName || MERCHANT_CITY)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 .\-/]/g, "")
      .slice(0, 15) || MERCHANT_CITY;
  }

  function getCityTxid(itemId, ibgeCode) {
    const cleanIbge = String(ibgeCode || "4113700").replace(/\D/g, "").slice(0, 7) || "4113700";
    if (itemId === "BUNDLE5") return "B5" + cleanIbge;
    if (itemId === "ALLACCESS") return "AA" + cleanIbge;
    if (itemId === "B2B") return "B2B" + cleanIbge;
    return String(itemId || "V") + cleanIbge;
  }

  function parseCityParams(searchStr) {
    const params = new URLSearchParams(searchStr || (typeof window !== "undefined" ? window.location.search : ""));
    const rawUf = String(params.get("uf") || "").toUpperCase().trim();
    const uf = UF_DATA[rawUf] ? rawUf : "PR";
    const cidade = String(params.get("cidade") || "").trim();
    const ibge = String(params.get("ibge") || "").replace(/\D/g, "").slice(0, 7);
    return { uf: uf, cidade: cidade, ibge: ibge };
  }

  function syncUrlParams(cityObj) {
    if (typeof window === "undefined" || !window.history || !window.history.replaceState) return;
    const params = new URLSearchParams(window.location.search);
    params.set("uf", cityObj.uf);
    params.set("cidade", cityObj.nome);
    params.set("ibge", cityObj.ibge);
    const nextUrl = window.location.pathname + "?" + params.toString() + (window.location.hash || "");
    window.history.replaceState(null, "", nextUrl);
  }

  function buildWhatsAppShareUrl(cidade, uf, pageUrl) {
    const shareTarget = pageUrl || (typeof window !== "undefined" ? window.location.href : "https://vitrine-vudotsur.pages.dev/");
    const msg = "Olha as ferramentas gratuitas de bolso, editais e CLT/PJ para " + cidade + " (" + uf + "): " + shareTarget;
    return "https://wa.me/?text=" + encodeURIComponent(msg);
  }

  function populateUfSelect(selectedUf) {
    if (!ufSelect) return;
    clearNode(ufSelect);
    Object.keys(UF_DATA).forEach(function (uf) {
      const opt = document.createElement("option");
      opt.value = uf;
      opt.textContent = uf + " — " + UF_DATA[uf].name;
      if (uf === selectedUf) opt.selected = true;
      ufSelect.appendChild(opt);
    });
  }

  function populateCitySelect(cities, selectedIbge, filterTerm) {
    if (!citySelect) return;
    clearNode(citySelect);
    const normFilter = normalizeText(filterTerm);
    const list = normFilter
      ? cities.filter(function (c) {
          return normalizeText(c.nome).indexOf(normFilter) !== -1 || String(c.id).indexOf(normFilter) !== -1;
        })
      : cities;

    const effectiveList = list.length > 0 ? list : cities;
    effectiveList.forEach(function (c) {
      const opt = document.createElement("option");
      opt.value = String(c.id);
      opt.textContent = c.nome;
      if (String(c.id) === String(selectedIbge)) opt.selected = true;
      citySelect.appendChild(opt);
    });
  }

  async function fetchCitiesForUf(uf) {
    if (cityCache[uf]) {
      return { cities: cityCache[uf], source: "cache" };
    }
    const storageKey = "vitrine_ibge_uf_" + uf;
    try {
      const cachedRaw = window.localStorage ? window.localStorage.getItem(storageKey) : null;
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cityCache[uf] = parsed;
          return { cities: parsed, source: "localStorage" };
        }
      }
    } catch (_e) {
      // Ignore storage errors
    }

    const url = IBGE_MUNICIPIOS_ENDPOINT.replace("{UF}", encodeURIComponent(uf)) + "?orderBy=nome";
    try {
      const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timerId = controller ? setTimeout(function () { controller.abort(); }, 6000) : null;
      const resp = await fetch(url, controller ? { signal: controller.signal } : undefined);
      if (timerId) clearTimeout(timerId);
      if (resp && resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          const normalized = data.map(function (m) {
            return { id: String(m.id), nome: String(m.nome) };
          });
          cityCache[uf] = normalized;
          try {
            if (window.localStorage) {
              window.localStorage.setItem(storageKey, JSON.stringify(normalized));
            }
          } catch (_e2) {
            // Ignore quota errors
          }
          return { cities: normalized, source: "ibge" };
        }
      }
    } catch (_err) {
      // Fall back to offline dictionary
    }

    const fallback = FALLBACK_CITIES_BY_UF[uf] || FALLBACK_CITIES_BY_UF.PR;
    cityCache[uf] = fallback;
    return { cities: fallback, source: "offline" };
  }

  function applyCitySelection(cityObj, _sourceLabel) {
    currentCity = {
      uf: cityObj.uf,
      nome: cityObj.nome,
      ibge: String(cityObj.ibge)
    };

    syncUrlParams(currentCity);

    document.title = "Vudotsur " + currentCity.nome + ", " + currentCity.uf + " | Ferramentas práticas para o seu bolso, carreira e faculdade";

    if (headerCityBadge) {
      headerCityBadge.textContent = currentCity.nome + ", " + currentCity.uf;
    }
    if (ibgeStatusBadge) {
      ibgeStatusBadge.textContent = currentCity.nome + ", " + currentCity.uf;
    }
    if (b2bBundleTitle) {
      b2bBundleTitle.textContent = "Monitoramento Personalizado para " + currentCity.nome;
    }
    if (footerCityEl) {
      footerCityEl.textContent = currentCity.nome + ", " + currentCity.uf;
    }
    if (btnWhatsappShare) {
      btnWhatsappShare.setAttribute("href", buildWhatsAppShareUrl(currentCity.nome, currentCity.uf));
    }

    renderCatalog(currentAudience);
  }

  async function selectUfAndCity(uf, targetIbge, targetCidade) {
    const validUf = UF_DATA[uf] ? uf : "PR";
    if (ufSelect) ufSelect.value = validUf;
    const result = await fetchCitiesForUf(validUf);
    const cities = result.cities;

    let match = null;
    if (targetIbge) {
      match = cities.find(function (c) { return String(c.id) === String(targetIbge); }) || null;
    }
    if (!match && targetCidade) {
      const normTarget = normalizeText(targetCidade);
      match = cities.find(function (c) { return normalizeText(c.nome) === normTarget; }) || null;
    }
    if (!match && validUf === "PR") {
      match = cities.find(function (c) { return String(c.id) === "4113700"; }) || cities[0];
    }
    if (!match) {
      match = cities[0];
    }

    populateCitySelect(cities, match.id, citySearchInput ? citySearchInput.value : "");
    applyCitySelection({ uf: validUf, nome: match.nome, ibge: match.id }, result.source);
  }

  // --- UI & Catalog Rendering (Zero innerHTML) ---
  const catalogGrid = document.getElementById("catalog-grid");
  const filterContainer = document.getElementById("audience-filters");
  const pixModal = document.getElementById("pix-modal");
  const modalItemTitle = document.getElementById("modal-item-title");
  const modalAmountBrl = document.getElementById("modal-amount-brl");
  const modalTxid = document.getElementById("modal-txid");
  const qrSvgContainer = document.getElementById("qr-svg-container");
  const pixKeyInput = document.getElementById("pix-key-input");
  const pixBrcodeInput = document.getElementById("pix-brcode-input");
  const linkConfirmPix = document.getElementById("link-confirm-pix");
  const copyToast = document.getElementById("copy-toast");
  const btnInstantUnlock = document.getElementById("btn-instant-unlock");
  const instantUnlockBox = document.getElementById("instant-unlock-box");
  const instantDownloadLink = document.getElementById("instant-download-link");

  function clearNode(node) {
    while (node && node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function formatBrl(value) {
    return "R$ " + Number(value).toFixed(2).replace(".", ",");
  }

  function openPixModal(itemId) {
    const item = CHECKOUT_ITEMS[itemId];
    if (!item || !pixModal) return;

    const cityTxid = getCityTxid(item.id, currentCity.ibge);
    const cityLabel = sanitizeAsciiCity(currentCity.nome);
    const baseTitle = item.dynamicTitlePrefix
      ? item.dynamicTitlePrefix + currentCity.nome
      : item.title;
    const displayTitle = item.id === "B2B"
      ? "Monitoramento Personalizado para " + currentCity.nome + " (" + currentCity.uf + ")"
      : baseTitle + " (" + currentCity.nome + ", " + currentCity.uf + ")";

    const brcode = generatePixBrCode(PIX_KEY, item.price, MERCHANT_NAME, cityLabel, cityTxid);

    if (modalItemTitle) modalItemTitle.textContent = displayTitle;
    if (modalAmountBrl) modalAmountBrl.textContent = formatBrl(item.price);
    if (modalTxid) modalTxid.textContent = cityTxid;
    if (pixKeyInput) pixKeyInput.value = PIX_KEY;
    if (pixBrcodeInput) pixBrcodeInput.value = brcode;

    if (qrSvgContainer) {
      clearNode(qrSvgContainer);
      qrSvgContainer.appendChild(renderQrSvg(brcode));
    }

    if (instantUnlockBox) instantUnlockBox.classList.add("hidden");
    if (instantDownloadLink) {
      instantDownloadLink.setAttribute("href", item.href || "../portfolio/poc_1_bolso_mercado/index.html");
    }

    if (linkConfirmPix) {
      const subject = encodeURIComponent("Comprovante Pix " + cityTxid + " - " + displayTitle);
      const body = encodeURIComponent("Olá! Segue meu comprovante Pix para liberação do item " + displayTitle + " (pedido: " + cityTxid + ", valor: " + formatBrl(item.price) + ").");
      linkConfirmPix.setAttribute("href", "mailto:" + PIX_KEY + "?subject=" + subject + "&body=" + body);
    }

    if (copyToast) copyToast.classList.add("hidden");
    pixModal.classList.remove("hidden");
    pixModal.classList.add("flex");
  }

  function closePixModal() {
    if (!pixModal) return;
    pixModal.classList.add("hidden");
    pixModal.classList.remove("flex");
  }

  function renderCatalog(selectedAudience) {
    if (!catalogGrid) return;
    currentAudience = selectedAudience || "Todos";
    clearNode(catalogGrid);

    const filtered = CATALOG_ITEMS.filter(function (item) {
      return currentAudience === "Todos" || item.audiences.indexOf(currentAudience) !== -1;
    });

    filtered.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "bento-card p-6 flex flex-col justify-between gap-5";

      const top = document.createElement("div");
      top.className = "space-y-3";

      const metaRow = document.createElement("div");
      metaRow.className = "flex items-center justify-between gap-2";

      const tagSpan = document.createElement("span");
      tagSpan.className = "px-2.5 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium";
      tagSpan.textContent = item.tag;

      const priceBadge = document.createElement("span");
      priceBadge.className = "text-xs font-semibold text-zinc-950 tabular-nums";
      priceBadge.textContent = formatBrl(item.price);

      metaRow.appendChild(tagSpan);
      metaRow.appendChild(priceBadge);

      const h3 = document.createElement("h3");
      h3.className = "text-lg font-bold text-zinc-950 leading-snug";
      h3.textContent = item.dynamicTitlePrefix
        ? item.dynamicTitlePrefix + currentCity.nome
        : item.title;

      const pDesc = document.createElement("p");
      pDesc.className = "text-sm text-zinc-600 leading-relaxed";
      pDesc.textContent = item.subtitle;

      top.appendChild(metaRow);
      top.appendChild(h3);
      top.appendChild(pDesc);

      const bottom = document.createElement("div");
      bottom.className = "pt-4 border-t border-zinc-200 flex flex-col gap-2";

      const buyBtn = document.createElement("button");
      buyBtn.setAttribute("type", "button");
      buyBtn.className = "w-full px-3.5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold transition tabular-nums";
      buyBtn.textContent = item.ctaLabel;
      buyBtn.addEventListener("click", function () {
        openPixModal(item.id);
      });

      const demoLink = document.createElement("a");
      demoLink.setAttribute("href", item.href);
      demoLink.className = "w-full text-center px-3 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold transition";
      demoLink.textContent = "Testar grátis no navegador";

      bottom.appendChild(buyBtn);
      bottom.appendChild(demoLink);

      card.appendChild(top);
      card.appendChild(bottom);
      catalogGrid.appendChild(card);
    });
  }

  function copyText(value, label) {
    if (!value) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).catch(function () {});
    }
    if (copyToast) {
      copyToast.textContent = label + " copiado para a área de transferência!";
      copyToast.classList.remove("hidden");
    }
  }

  // Event bindings
  if (ufSelect) {
    ufSelect.addEventListener("change", function () {
      if (citySearchInput) citySearchInput.value = "";
      selectUfAndCity(ufSelect.value, "", "");
    });
  }

  if (citySelect) {
    citySelect.addEventListener("change", function () {
      const cities = cityCache[currentCity.uf] || FALLBACK_CITIES_BY_UF[currentCity.uf] || [];
      const found = cities.find(function (c) { return String(c.id) === String(citySelect.value); });
      if (found) {
        applyCitySelection({ uf: currentCity.uf, nome: found.nome, ibge: found.id }, "select");
      }
    });
  }

  if (citySearchInput) {
    citySearchInput.addEventListener("input", function () {
      const cities = cityCache[currentCity.uf] || FALLBACK_CITIES_BY_UF[currentCity.uf] || [];
      populateCitySelect(cities, currentCity.ibge, citySearchInput.value);
      if (citySelect && citySelect.options.length > 0) {
        const selectedOpt = citySelect.options[citySelect.selectedIndex] || citySelect.options[0];
        const found = cities.find(function (c) { return String(c.id) === String(selectedOpt.value); });
        if (found && String(found.id) !== String(currentCity.ibge)) {
          applyCitySelection({ uf: currentCity.uf, nome: found.nome, ibge: found.id }, "search");
        }
      }
    });
  }

  if (filterContainer) {
    filterContainer.addEventListener("click", function (ev) {
      const btn = ev.target.closest("button[data-audience]");
      if (!btn) return;
      const buttons = filterContainer.querySelectorAll("button[data-audience]");
      buttons.forEach(function (b) {
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });
      renderCatalog(btn.getAttribute("data-audience"));
    });
  }

  document.querySelectorAll("button[data-checkout-id]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      openPixModal(btn.getAttribute("data-checkout-id"));
    });
  });

  const btnHeaderBundle = document.getElementById("btn-header-bundle");
  if (btnHeaderBundle) {
    btnHeaderBundle.addEventListener("click", function () {
      openPixModal("BUNDLE5");
    });
  }

  const btnCloseModal = document.getElementById("btn-close-modal");
  if (btnCloseModal) {
    btnCloseModal.addEventListener("click", closePixModal);
  }

  if (pixModal) {
    pixModal.addEventListener("click", function (ev) {
      if (ev.target === pixModal) closePixModal();
    });
  }

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closePixModal();
  });

  const btnCopyKey = document.getElementById("btn-copy-key");
  if (btnCopyKey) {
    btnCopyKey.addEventListener("click", function () {
      copyText(pixKeyInput ? pixKeyInput.value : PIX_KEY, "Chave Pix (" + PIX_KEY + ")");
    });
  }

  const btnCopyBrcode = document.getElementById("btn-copy-brcode");
  if (btnCopyBrcode) {
    btnCopyBrcode.addEventListener("click", function () {
      copyText(pixBrcodeInput ? pixBrcodeInput.value : "", "Pix Copia-e-Cola");
    });
  }

  if (btnInstantUnlock) {
    btnInstantUnlock.addEventListener("click", function () {
      if (instantUnlockBox) {
        instantUnlockBox.classList.remove("hidden");
      }
    });
  }

  // Initial boot with URL query param sync
  const bootParams = parseCityParams();
  populateUfSelect(bootParams.uf);
  renderCatalog("Todos");
  selectUfAndCity(bootParams.uf, bootParams.ibge, bootParams.cidade);
})();
