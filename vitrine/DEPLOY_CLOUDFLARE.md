```yaml
id: DEPLOY-CLOUDFLARE-001
cost: "$0.00 / month (Cloudflare Pages Free Tier)"
bandwidth: "Unlimited"
commercial_tos_status: "COMPLIANT (Commercial SaaS / Pix / Polar.sh permitted)"
academic_origin: "https://vudotsur.github.io/paper-intro/ (Academic Showcase ONLY — GitHub Pages ToS Sec. 4)"
commercial_origin: "https://<project>.pages.dev (Vitrine Comercial + Combos Pix + Polar.sh)"
```

# Deploy $0 na Cloudflare Pages Free — Vitrine Comercial

## Por que separar GitHub Pages (Acadêmico) vs Cloudflare Pages (Comercial)?

| Superfície | Host | Finalidade | Status ToS |
| :--- | :--- | :--- | :--- |
| `vudotsur.github.io/paper-intro/` | **GitHub Pages** | Paper vivo, DAG de Kahn, métricas empíricas e PoCs demonstrativos gratuitos | **100% Acadêmico / Não-Comercial** (conforme GitHub Terms of Service, Seção 4) |
| `vitrine-*.pages.dev` | **Cloudflare Pages Free** | Vitrine Comercial, Combos Pré-Pagos Pix (`vudotsur@gmail.com`), Checkout Polar.sh (USD) e Serviços B2B | **100% Comercial Permitido** ($0/mês, SSL automático, banda ilimitada) |

---

## Opção A — Deploy em 3 Passos via CLI (`npx wrangler pages deploy`)

Pré-requisito: Node.js instalado (`node -v`). Não precisa pagar nada nem cadastrar cartão de crédito na Cloudflare.

```powershell
# Passo 1: Autenticar na Cloudflare (abre o navegador 1x para login gratuito)
npx wrangler login

# Passo 2: Criar o projeto Pages (apenas na primeira vez)
npx wrangler pages project create vitrine-comercial --production-branch=main

# Passo 3: Publicar a pasta vitrine/ (ou paper/presentation/vitrine/)
npx wrangler pages deploy ./vitrine --project-name=vitrine-comercial
```

> Saída esperada: URL pública imediata `https://vitrine-comercial.pages.dev` com HTTPS ativo.

---

## Opção B — Deploy em 3 Passos via Painel GitHub + Cloudflare Dashboard (Zero CLI)

1. **Conectar Repositório:** Acesse [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → selecione o repositório `admin`.
2. **Configurar Build ($0 Estático):**
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** *(deixar vazio)*
   - **Build output directory:** `vitrine` *(ou `paper/presentation/vitrine` caso a vitrine esteja aninhada lá)*
3. **Publicar e Atualizar Link:** Clique em **Save and Deploy**. A cada `git push origin main`, a Cloudflare republica automaticamente a vitrine comercial em ~15 segundos sem custo.

---

## Checklist Pós-Deploy (30 segundos)

- [ ] Abrir a URL `https://vitrine-comercial.pages.dev` em aba anônima.
- [ ] Testar botão de cópia da chave Pix (`vudotsur@gmail.com`) e geração do Copia-e-Cola EMVCo.
- [ ] Conferir se os links de volta para o paper acadêmico (`vudotsur.github.io/paper-intro/`) abrem sem erro 404.
