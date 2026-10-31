import { flushSync } from "react-dom";
import { inviteMessage } from "../../../supabase/functions/_shared/invite-message";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Download,
  FileText,
  LayoutDashboard,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cloud, useConcilia } from "./data";
import {
  billing,
  billableCount,
  cashFlow,
  categories,
  cycleNow,
  formatDocument,
  statementTotals,
  money,
  upgrade,
  type Client,
  type Organization,
  type Plan,
  type Transaction,
} from "./domain";
import { billingCsv, delimited, download, ofx } from "./exports";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const titles: Record<string, string> = {
  dashboard: "Visão geral",
  clientes: "Clientes",
  extratos: "Extratos bancários",
  "conciliacao-ia": "Conciliação com IA",
  "fluxo-de-caixa": "Fluxo de caixa",
  configuracoes: "Configurações",
  escritorios: "Escritórios",
  planos: "Planos e limites",
  faturamento: "Faturamento",
};
const officeNav = [
  ["dashboard", LayoutDashboard],
  ["clientes", Users],
  ["extratos", FileText],
  ["conciliacao-ia", Sparkles],
  ["fluxo-de-caixa", Activity],
  ["configuracoes", Settings],
] as const;
const adminNav = [
  ["dashboard", LayoutDashboard],
  ["escritorios", Building2],
  ["planos", CreditCard],
  ["faturamento", Wallet],
] as const;
export function App({ page = "dashboard", admin = false }: { page?: string; admin?: boolean }) {
  return <Workspace page={page} admin={admin} />;
}
export function notify(error: unknown) {
  toast.error(error instanceof Error ? error.message : "Não foi possível concluir a operação.");
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  return (
    <div className="ca-modal-backdrop" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="ca-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ca-row">
          <h2>{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Fechar" onClick={close}>
            <X size={18} />
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="ca-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Status({ value }: { value: string }) {
  const labels: Record<string, string> = {
    active: "Ativo",
    past_due: "Em carência",
    suspended: "Suspenso",
    UPDATED: "Sincronizado",
    UPDATING: "Atualizando",
    LOGIN_ERROR: "Reconexão necessária",
    WAITING_USER_INPUT: "Autenticação pendente",
    OUTDATED: "Desatualizado",
    pending: "Pendente",
    reviewed: "Revisado",
  };
  return (
    <span
      className={`ca-badge ${["active", "UPDATED", "reviewed"].includes(value) ? "success" : ["suspended", "LOGIN_ERROR"].includes(value) ? "danger" : "warning"}`}
    >
      <i />
      {labels[value] ?? value}
    </span>
  );
}
export function Metric({
  label,
  value,
  detail,
  icon: Icon = Wallet,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon?: typeof Wallet;
}) {
  return (
    <article className="ca-metric">
      <div className="ca-row">
        <span>{label}</span>
        <div className="ca-metric-icon">
          <Icon size={18} />
        </div>
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
export function Empty({ text = "Nenhum registro encontrado." }: { text?: string }) {
  return (
    <div className="ca-empty">
      <FileText size={28} />
      <h3>{text}</h3>
      <p>Os dados aparecerão aqui conforme sua operação evoluir.</p>
    </div>
  );
}
function Login() {
  const s = useConcilia();
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await s.login(String(f.get("email")), String(f.get("password")));
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="ca-login">
      <section>
        <div className="ca-brand">
          <span>
            <Activity />
          </span>
          concilia<span className="ca-ai">AI</span>
        </div>
        <span className="ca-eyebrow">INTELIGÊNCIA PARA A SUA CONTABILIDADE</span>
        <h1>
          Menos coleta.
          <br />
          Mais clareza financeira.
        </h1>
        <p>
          Conecte os bancos dos seus clientes, centralize extratos e transforme movimentações em
          conversas que geram valor.
        </p>
        <div className="ca-login-points">
          <span>
            <ShieldCheck /> Conexões seguras via Open Finance
          </span>
          <span>
            <FileText /> Extratos padronizados para sua operação
          </span>
          <span>
            <Sparkles /> Inteligência financeira consultiva
          </span>
        </div>
        <small>Hub bancário para escritórios contábeis · Concilia AI</small>
      </section>
      <article className="ca-login-card">
        <span className="ca-eyebrow">BEM-VINDO AO CONCILIA AI</span>
        <h2>Seu escritório conectado.</h2>
        <p>Entre com o acesso disponibilizado pelo administrador.</p>
        <form onSubmit={submit}>
          <Field label="E-mail">
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="voce@escritorio.com.br"
            />
          </Field>
          <Field label="Senha">
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="Sua senha"
            />
          </Field>
          <Button type="submit" disabled={busy} className="ca-full">
            {busy ? "Entrando…" : "Acessar plataforma"}
            <ChevronRight size={16} />
          </Button>
        </form>
        {s.error && (
          <p role="alert" className="ca-error">
            {s.error}
          </p>
        )}
        <div className="ca-divider">CONHEÇA A PLATAFORMA</div>
        <Button variant="outline" onClick={s.enterDemo} className="ca-full">
          Explorar demonstração
        </Button>
        <small>
          Ambiente demonstrativo com dados fictícios. Nenhuma conexão bancária é realizada.
        </small>
      </article>
    </div>
  );
}
function Workspace({ page, admin }: { page: string; admin: boolean }) {
  const s = useConcilia();
  const [mobile, setMobile] = useState(false);
  const [cycle, setCycle] = useState(cycleNow());
  if (s.loading && !s.user && !s.demo)
    return (
      <div className="ca-loading">
        <RefreshCw className="animate-spin" /> Carregando sua plataforma…
      </div>
    );
  if (!s.user && !s.demo) return <Login />;
  const org = s.data.organizations.find((o) => o.id === s.organizationId);
  const plan = s.data.plans.find((p) => p.id === org?.plan_id);
  const count = org ? billableCount(s.data, org.id, cycle) : 0;
  const nav = admin ? adminNav : officeNav;
  const allowed = page in titles && nav.some(([p]) => p === page);
  return (
    <div className="ca-workspace">
      <aside className={`ca-sidebar ${mobile ? "is-open" : ""}`}>
        <a href="/" className="ca-brand">
          <span>
            <Activity />
          </span>
          concilia<span className="ca-ai">AI</span>
        </a>
        <div className="ca-workspace-label">
          {admin ? "GESTÃO DA PLATAFORMA" : "ESPAÇO DO ESCRITÓRIO"}
        </div>
        <nav>
          {nav.map(([p, Icon]) => (
            <Link
              key={p}
              to={admin ? "/admin/$page" : "/app/$page"}
              params={{ page: p }}
              className={page === p ? "active" : ""}
              onClick={() => setMobile(false)}
            >
              <Icon size={19} />
              {titles[p]}
              {p === "conciliacao-ia" && <span className="ca-new">IA</span>}
            </Link>
          ))}
        </nav>
        <div className="ca-sidebar-bottom">
          {plan && (
            <div className="ca-plan-summary">
              <div className="ca-row">
                <span>Plano {plan.name}</span>
                <strong>
                  {count}/{plan.included_items}
                </strong>
              </div>
              <progress value={Math.min(count, plan.included_items)} max={plan.included_items} />
              <small>Itens bancários no ciclo selecionado</small>
            </div>
          )}
          {s.superAdmin && (
            <Link to={admin ? "/app/$page" : "/admin/$page"} params={{ page: "dashboard" }}>
              <ShieldCheck size={17} />
              {admin ? "Painel do escritório" : "Administração"}
            </Link>
          )}
          <button onClick={() => void s.logout().catch(notify)}>
            <LogOut size={17} />
            Sair da plataforma
          </button>
          <div className="ca-sidebar-foot">
            <span className="ca-avatar">{org?.name.slice(0, 2).toUpperCase() ?? "CA"}</span>
            <div>
              <strong>{org?.name ?? "Super Admin"}</strong>
              <small>{s.demo ? "Demonstração" : s.user?.email}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="ca-main">
        <header className="ca-topbar">
          <button className="ca-menu" aria-label="Abrir menu" onClick={() => setMobile(!mobile)}>
            <LayoutDashboard size={20} />
          </button>
          <span className="ca-breadcrumb">
            {admin ? "Plataforma" : "Escritório"}
            <ChevronRight size={14} />
            <strong>{titles[page] ?? "Página"}</strong>
          </span>
          <div className="ca-row">
            {s.superAdmin && s.data.organizations.length > 0 && (
              <select
                aria-label="Selecionar escritório"
                value={s.organizationId}
                onChange={(e) => s.setOrganizationId(e.target.value)}
              >
                {s.data.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
            <span className="ca-cloud">
              <i />
              Lovable Cloud
            </span>
          </div>
        </header>
        {s.demo && (
          <div className="ca-demo-banner">
            Ambiente demonstrativo · Todos os dados são fictícios e as alterações ficam apenas nesta
            sessão.
          </div>
        )}
        {s.error && (
          <div className="ca-alert danger" role="alert">
            Falha ao carregar dados: {s.error}
            <Button variant="outline" onClick={() => void s.refresh()}>
              Tentar novamente
            </Button>
          </div>
        )}
        {org?.status === "past_due" && (
          <div className="ca-alert warning">
            Sua licença está em carência. Sincronizações e exportações continuam liberadas durante
            esse período.
          </div>
        )}
        {org?.status === "suspended" && (
          <div className="ca-alert danger">
            Licença suspensa. Novas conexões, exportações e sincronizações estão bloqueadas até a
            regularização.
          </div>
        )}
        <main className="ca-content">
          <div className="ca-page-heading">
            <div>
              <span className="ca-eyebrow">
                {admin ? "CONCILIA AI / ADMINISTRAÇÃO" : "SEU HUB DE INTELIGÊNCIA FINANCEIRA"}
              </span>
              <h1>{titles[page] ?? "Página não encontrada"}</h1>
              <p>
                {admin
                  ? "Uma visão completa da operação, das licenças e dos resultados."
                  : "As informações que você precisa, em um só lugar."}
              </p>
            </div>
            <div className="ca-row">
              <input
                aria-label="Competência"
                type="month"
                value={cycle}
                onChange={(e) => {
                  if (e.target.value) setCycle(e.target.value);
                }}
              />
              <Button
                variant="outline"
                aria-label="Atualizar dados"
                disabled={s.loading}
                onClick={() => void s.refresh()}
              >
                <RefreshCw size={16} className={s.loading ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
          {!allowed ? (
            <Empty text="Página não encontrada." />
          ) : admin && !s.superAdmin ? (
            <Empty text="Acesso restrito ao administrador da plataforma." />
          ) : !admin && !org ? (
            <Empty text="Seu usuário ainda não está vinculado a um escritório. Contate o administrador." />
          ) : admin ? (
            <AdminPage page={page} cycle={cycle} />
          ) : page === "dashboard" ? (
            <OfficeDashboard cycle={cycle} />
          ) : page === "clientes" ? (
            <Clients key={s.organizationId} />
          ) : page === "extratos" ? (
            <Statements key={s.organizationId} cycle={cycle} />
          ) : page === "conciliacao-ia" ? (
            <Reconciliation key={s.organizationId} cycle={cycle} />
          ) : page === "fluxo-de-caixa" ? (
            <CashFlow key={s.organizationId} cycle={cycle} />
          ) : (
            <Configuration key={s.organizationId} />
          )}
          <footer className="ca-footer">
            <span>Concilia AI · Coleta bancária e inteligência financeira</span>
            <span>
              <ShieldCheck size={13} /> Ambiente protegido
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function OfficeDashboard({ cycle }: { cycle: string }) {
  const s = useConcilia();
  const org = s.data.organizations.find((o) => o.id === s.organizationId)!;
  const plan = s.data.plans.find((p) => p.id === org.plan_id);
  const clients = s.data.clients.filter((c) => c.organization_id === org.id);
  const items = s.data.items.filter((i) => i.organization_id === org.id);
  const accounts = s.data.accounts.filter((a) => a.organization_id === org.id);
  const rows = s.data.transactions.filter(
    (t) => t.organization_id === org.id && t.date.startsWith(cycle),
  );
  const flow = cashFlow(rows);
  const count = billableCount(s.data, org.id, cycle);
  const usage = plan ? billing(plan, count) : null;
  const next = plan ? upgrade(plan, count, s.data.plans) : null;
  const issues = items.filter((i) => !["UPDATED", "UPDATING"].includes(i.status));
  return (
    <>
      <div className="ca-metrics">
        <Metric
          label="Clientes na carteira"
          value={clients.length}
          detail="Empresas atendidas pelo escritório"
          icon={Users}
        />
        <Metric
          label="Itens bancários no ciclo"
          value={count}
          detail={`${accounts.length} contas vinculadas · ${plan?.included_items ?? 0} itens incluídos`}
          icon={Building2}
        />
        <Metric
          label="Movimentação de entradas"
          value={money(flow.inflow)}
          detail="Total operacional na competência"
          icon={ArrowDownLeft}
        />
        <Metric
          label="Aguardando revisão"
          value={flow.pending}
          detail="Transações para conferir"
          icon={Sparkles}
        />
      </div>
      <div className="ca-dashboard-grid">
        <section className="ca-card">
          <div className="ca-section-heading">
            <div>
              <h2>Movimentação financeira</h2>
              <p>Entradas e saídas operacionais da carteira</p>
            </div>
            <span className="ca-badge neutral">{cycle.split("-").reverse().join("/")}</span>
          </div>
          <FlowChart rows={rows} />
          <div className="ca-chart-key">
            <span>
              <i className="positive" />
              Entradas
            </span>
            <span>
              <i className="negative" />
              Saídas
            </span>
          </div>
        </section>
        <section className="ca-card ca-consumption">
          <span className="ca-eyebrow">SUA OPERAÇÃO EM DIA</span>
          <div className="ca-row">
            <h2>Consumo do plano</h2>
            <CreditCard size={22} />
          </div>
          <strong className="ca-large">
            {count}
            <small> / {plan?.included_items ?? 0} itens</small>
          </strong>
          <progress
            max={plan?.included_items ?? 1}
            value={Math.min(count, plan?.included_items ?? 1)}
          />
          <p>
            Uma conexão bancária pode trazer várias contas. O limite considera itens, não contas.
          </p>
          {usage && usage.ratio >= 0.8 && (
            <div className="ca-alert warning">
              {usage.ratio >= 1 ? "Franquia atingida" : "Você atingiu 80% da franquia"}.
              {next && ` O plano ${next.name} oferece menor custo neste volume.`}
            </div>
          )}
          <div className="ca-plan-total">
            <span>Projeção do ciclo</span>
            <strong>{money(usage?.total ?? 0)}</strong>
          </div>
          <Link to="/app/$page" params={{ page: "configuracoes" }} className="ca-text-link">
            Ver detalhes da licença
            <ChevronRight size={15} />
          </Link>
        </section>
      </div>
      <section className="ca-card">
        <div className="ca-section-heading">
          <div>
            <h2>Conexões que precisam de atenção</h2>
            <p>Acompanhe autenticações e mantenha a coleta atualizada.</p>
          </div>
          <span className="ca-badge warning">{issues.length} pendências</span>
        </div>
        {issues.length ? (
          <div className="ca-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Instituição</th>
                  <th>Situação</th>
                  <th>Última sincronização</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <strong>
                        {clients.find((c) => c.id === i.client_id)?.name ?? "Cliente"}
                      </strong>
                    </td>
                    <td>
                      <span className="ca-bank-icon">{i.connector_name.slice(0, 2)}</span>
                      {i.connector_name}
                    </td>
                    <td>
                      <Status value={i.status} />
                    </td>
                    <td>
                      {i.last_synced_at
                        ? new Date(i.last_synced_at).toLocaleDateString("pt-BR")
                        : "Aguardando"}
                    </td>
                    <td>
                      <Link to="/app/$page" params={{ page: "clientes" }} className="ca-text-link">
                        Ver cliente
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Nenhuma conexão com pendência." />
        )}
      </section>
    </>
  );
}
function FlowChart({ rows }: { rows: Transaction[] }) {
  const grouped = Array.from({ length: 31 }, (_, i) => ({
    day: String(i + 1).padStart(2, "0"),
    entradas: 0,
    saidas: 0,
  }));
  rows
    .filter((t) => t.category !== "Transferências Internas")
    .forEach((t) => {
      const d = grouped[Number(t.date.slice(8, 10)) - 1];
      if (d) {
        if (t.amount > 0) d.entradas += t.amount;
        else d.saidas -= t.amount;
      }
    });
  if (!rows.length) return <Empty text="Sem movimentações nesta competência." />;
  return (
    <div className="ca-chart">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={grouped}>
          <defs>
            <linearGradient id="flowGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a880" stopOpacity={0.24} />
              <stop offset="100%" stopColor="#16a880" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#e8edf3" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} interval={4} fontSize={11} />
          <YAxis
            tickLine={false}
            axisLine={false}
            fontSize={11}
            tickFormatter={(v) => `${Number(v) / 1000}k`}
          />
          <Tooltip formatter={(v) => money(Number(v))} />
          <Area
            type="monotone"
            dataKey="entradas"
            name="Entradas"
            stroke="#129879"
            fill="url(#flowGreen)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="saidas"
            name="Saídas"
            stroke="#e3a43b"
            fill="transparent"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
function Clients() {
  const s = useConcilia();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Client | null | undefined>();
  const [link, setLink] = useState<{ url: string; client: Client } | null>(null);
  const [selected, setSelected] = useState<Client | null>(null);
  const [busy, setBusy] = useState(false);
  const org = s.data.organizations.find((o) => o.id === s.organizationId)!;
  const clients = s.data.clients.filter(
    (c) =>
      c.organization_id === org.id &&
      `${c.name} ${c.cnpj_cpf}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      await s.saveClient(
        {
          name: String(f.get("name")),
          cnpj_cpf: String(f.get("cnpj_cpf")),
          contact_name: String(f.get("contact_name")),
          contact_email: String(f.get("contact_email")),
          contact_whatsapp: String(f.get("contact_whatsapp")),
        },
        editing?.id,
      );
      setEditing(undefined);
      toast.success("Cliente salvo.");
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  }
  const message = link ? inviteMessage({ organizationName: org.name, clientName: link.client.name,
    contactName: link.client.contact_name, url: link.url }) : null;
  async function invite(c: Client, itemId?: string) {
    setBusy(true);
    try {
      setLink({ url: await s.invite(c.id, itemId), client: c });
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="ca-toolbar">
        <div className="ca-search">
          <Search size={17} />
          <input
            aria-label="Buscar clientes"
            placeholder="Buscar por nome ou documento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button disabled={org.status === "suspended"} onClick={() => setEditing(null)}>
          <Plus size={16} />
          Novo cliente
        </Button>
      </div>
      <section className="ca-card">
        <div className="ca-section-heading">
          <div>
            <h2>Sua carteira de clientes</h2>
            <p>{clients.length} empresas · Uma visão de todas as conexões</p>
          </div>
        </div>
        {clients.length ? (
          <div className="ca-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empresa / documento</th>
                  <th>Contato</th>
                  <th>Conexões</th>
                  <th>Contas</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button className="ca-cell-button" onClick={() => setSelected(c)}>
                        <strong>{c.name}</strong>
                        <small>{c.cnpj_cpf}</small>
                      </button>
                    </td>
                    <td>
                      {c.contact_name || "—"}
                      <small>{c.contact_email}</small>
                    </td>
                    <td>{s.data.items.filter((i) => i.client_id === c.id).length} itens</td>
                    <td>{s.data.accounts.filter((a) => a.client_id === c.id).length} contas</td>
                    <td>
                      <div className="ca-row">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy || org.status === "suspended"}
                          onClick={() => void invite(c)}
                        >
                          <Link2 size={14} />
                          Novo link
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditing(c)}>
                          Editar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Cadastre seu primeiro cliente." />
        )}
      </section>
      {editing !== undefined && (
        <Modal
          title={editing ? "Editar cliente" : "Novo cliente"}
          close={() => setEditing(undefined)}
        >
          <form onSubmit={save}>
            <Field label="Razão social / nome">
              <input name="name" defaultValue={editing?.name} required maxLength={180} />
            </Field>
            <Field label="CNPJ / CPF">
              <input
                name="cnpj_cpf"
                defaultValue={editing?.cnpj_cpf}
                required
                pattern="[0-9./\- ]{11,18}"
              />
            </Field>
            <Field label="Nome do contato">
              <input name="contact_name" defaultValue={editing?.contact_name} />
            </Field>
            <div className="ca-form-grid">
              <Field label="E-mail">
                <input name="contact_email" type="email" defaultValue={editing?.contact_email} />
              </Field>
              <Field label="WhatsApp com DDI">
                <input
                  name="contact_whatsapp"
                  placeholder="5545999999999"
                  defaultValue={editing?.contact_whatsapp}
                />
              </Field>
            </div>
            <Button type="submit" disabled={busy}>
              Salvar cliente
            </Button>
          </form>
        </Modal>
      )}
      {link && (
        <Modal title="Link de conexão bancária" close={() => setLink(null)}>
          <p>
            Compartilhe com {link.client.contact_name || link.client.name}. O convite real expira em
            48 horas e permite uma conexão.
          </p>
          <input readOnly aria-label="Link gerado" value={link.url} />
          <div className="ca-actions">
            <Button
              onClick={() =>
                void navigator.clipboard
                  .writeText(link.url)
                  .then(() => toast.success("Link copiado."))
                  .catch(notify)
              }
            >
              Copiar link
            </Button>
            {link.client.contact_whatsapp && (
              <Button variant="outline" asChild>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`https://wa.me/${link.client.contact_whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(message!.whatsapp)}`}
                >
                  WhatsApp
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              disabled={busy || !link.client.contact_email}
              onClick={async () => {
                if (s.demo) {
                  toast.info("Demonstração: nenhum e-mail foi enviado.");
                  return;
                }
                setBusy(true);
                try {
                  const token = new URL(link.url).pathname.split("/").at(-1);
                  const { data, error } = await cloud.functions.invoke("send-invite-email", {
                    body: { token },
                  });
                  if (error || data?.error)
                    throw new Error(data?.error ?? "Falha ao enviar convite.");
                  toast.success("Convite enviado por e-mail.");
                } catch (e) {
                  notify(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Enviar e-mail
            </Button>
            <Button variant="outline" asChild>
              <a
                href={`mailto:${link.client.contact_email}?subject=${encodeURIComponent(message!.subject)}&body=${encodeURIComponent(message!.text)}`}
              >
                Preparar e-mail
              </a>
            </Button>
          </div>
          <small>
            “Enviar e-mail” usa o provedor configurado no backend. “Preparar e-mail” abre seu
            aplicativo de correio.
          </small>
        </Modal>
      )}
      {selected && (
        <Modal title={selected.name} close={() => setSelected(null)}>
          <h3>Itens bancários</h3>
          {s.data.items
            .filter((i) => i.client_id === selected.id)
            .map((i) => (
              <div key={i.id} className="ca-detail-row">
                <strong>{i.connector_name}</strong>
                <Status value={i.status} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || org.status === "suspended"}
                  onClick={() => {
                    setSelected(null);
                    void invite(selected, i.id);
                  }}
                >
                  Reconectar
                </Button>
              </div>
            ))}
          <h3>Contas vinculadas</h3>
          {s.data.accounts
            .filter((a) => a.client_id === selected.id)
            .map((a) => (
              <div key={a.id} className="ca-detail-row">
                <span>
                  {a.name} · Ag. {a.agency} · {a.number}
                </span>
                <strong>{money(a.balance)}</strong>
              </div>
            ))}
        </Modal>
      )}
    </>
  );
}
function useFiltered(cycle: string) {
  const s = useConcilia();
  const [client, setClient] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const accounts = s.data.accounts.filter(
    (a) =>
      a.organization_id === s.organizationId &&
      (!client || a.client_id === client) &&
      (!bank || a.bank_item_id === bank),
  );
  const rows = s.data.transactions
    .filter(
      (t) =>
        t.organization_id === s.organizationId &&
        t.date.startsWith(cycle) &&
        (!client || t.client_id === client) &&
        (!account || t.bank_account_id === account) &&
        (!bank || accounts.some((a) => a.id === t.bank_account_id)) &&
        (!type || t.type === type) &&
        t.description.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  return {
    s,
    rows,
    client,
    bank,
    account,
    search,
    type,
    accounts,
    filters: (
      <div className="ca-filters">
        <select
          aria-label="Filtrar cliente"
          value={client}
          onChange={(e) => {
            setClient(e.target.value);
            setBank("");
            setAccount("");
          }}
        >
          <option value="">Todos os clientes</option>
          {s.data.clients
            .filter((c) => c.organization_id === s.organizationId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filtrar banco"
          value={bank}
          onChange={(e) => {
            setBank(e.target.value);
            setAccount("");
          }}
        >
          <option value="">Todos os bancos</option>
          {s.data.items
            .filter(
              (i) => i.organization_id === s.organizationId && (!client || i.client_id === client),
            )
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.connector_name} · {s.data.clients.find((c) => c.id === i.client_id)?.name}
              </option>
            ))}
        </select>
        <select
          aria-label="Filtrar conta"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        >
          <option value="">Todas as contas</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} · {a.number}
            </option>
          ))}
        </select>
        <select aria-label="Filtrar tipo" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Entradas e saídas</option>
          <option value="CREDIT">Entradas</option>
          <option value="DEBIT">Saídas</option>
        </select>
        <div className="ca-search">
          <Search size={16} />
          <input
            aria-label="Buscar transações"
            placeholder="Buscar descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
    ),
  };
}
function Statements({ cycle }: { cycle: string }) {
  const f = useFiltered(cycle);
  const [page, setPage] = useState(0);
  const org = f.s.data.organizations.find((o) => o.id === f.s.organizationId)!;
  const disabled = org.status === "suspended";
  const pages = Math.max(1, Math.ceil(f.rows.length / 20));
  const current = Math.min(page, pages - 1);
  const summary = statementTotals(f.rows);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  useEffect(() => {
    const prepare = () => flushSync(() => setGeneratedAt(new Date()));
    window.addEventListener("beforeprint", prepare);
    return () => window.removeEventListener("beforeprint", prepare);
  }, []);
  const selectedAccount = f.accounts.find((a) => a.id === f.account);
  const selectedItem = f.s.data.items.find((i) => i.id === f.bank);
  const selectedClient = f.s.data.clients.find((c) => c.id ===
    (f.client || selectedAccount?.client_id || selectedItem?.client_id));
  const periodEnd = new Date(Number(cycle.slice(0, 4)), Number(cycle.slice(5)), 0).getDate();
  const period = `01/${cycle.slice(5)}/${cycle.slice(0, 4)} a ${periodEnd}/${cycle.slice(5)}/${cycle.slice(0, 4)}`;
  async function exportFile(kind: string) {
    try {
      if (!f.s.demo) {
        const { data: currentLicense, error } = await cloud
          .from("organizations")
          .select("status")
          .eq("id", org.id)
          .single();
        if (error || !currentLicense || currentLicense.status === "suspended")
          throw new Error("Exportação indisponível. Verifique a licença.");
      }
      if (disabled) throw new Error("Exportações bloqueadas pela licença.");
      if (!f.rows.length) throw new Error("Não há transações para exportar.");
      if (kind === "pdf") {
        flushSync(() => setGeneratedAt(new Date()));
        window.print();
        return;
      }
      if (kind === "ofx") {
        const account = f.s.data.accounts.find((a) => a.id === f.account);
        if (!account) throw new Error("Selecione uma única conta para exportar OFX.");
        download(
          `extrato-${cycle}.ofx`,
          ofx(
            f.rows,
            account,
            `${cycle}-01`,
            `${cycle}-${new Date(Number(cycle.slice(0, 4)), Number(cycle.slice(5)), 0).getDate()}`,
          ),
        );
      } else download(`extrato-${cycle}.txt`, delimited(f.rows));
    } catch (err) {
      notify(err);
    }
  }
  return (
    <>
      {f.filters}
      <div className="ca-metrics three">
        <Metric
          label="Entradas no período"
          value={money(summary.inflow)}
          detail={`${f.rows.filter((t) => t.amount > 0).length} transações de crédito`}
          icon={ArrowDownLeft}
        />
        <Metric
          label="Saídas no período"
          value={money(summary.outflow)}
          detail={`${f.rows.filter((t) => t.amount < 0).length} transações de débito`}
          icon={ArrowUpRight}
        />
        <Metric
          label="Movimentação líquida"
          value={money(summary.net)}
          detail="Não representa o saldo bancário"
        />
      </div>
      <section className="ca-card ca-statement">
        <header className="ca-print-only ca-report-header">
          <strong>{org.name}</strong>
          <h2>Relatório de Movimentações Financeiras</h2>
          <p>Empresa: <strong>{selectedClient?.name ?? "Carteira consolidada — todos os clientes"}</strong></p>
          <p>CNPJ/CPF: {selectedClient ? formatDocument(selectedClient.cnpj_cpf) : "Múltiplas empresas — identificação por lançamento"}</p>
          <p>{selectedAccount
            ? `Banco: ${f.s.data.items.find((i) => i.id === selectedAccount.bank_item_id)?.connector_name ?? selectedAccount.name} · Código: ${selectedAccount.bank_code || "Não informado"} · Agência: ${selectedAccount.agency || "Não informada"} · Conta: ${selectedAccount.number || "Não informada"}`
            : `Todas as contas correntes${selectedItem ? ` · Banco: ${selectedItem.connector_name}` : ""}`}</p>
          <p>Período: {period}</p>
          <p>Emissão: {generatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília)</p>
          <p>Filtros: {f.type === "CREDIT" ? "Entradas" : f.type === "DEBIT" ? "Saídas" : "Entradas e saídas"}{f.search ? ` · Descrição: ${f.search}` : ""} · {f.rows.length} transações</p>
          <div className="ca-report-totals">
            <div><span>Total de Entradas</span><strong className="ca-credit">{money(summary.inflow)}</strong></div>
            <div><span>Total de Saídas</span><strong className="ca-debit">{money(summary.outflow)}</strong></div>
            <div><span>Resultado Líquido do Período</span><strong>{money(summary.net)}</strong></div>
          </div>
          <small>Entradas menos saídas de todos os lançamentos filtrados; não representa o saldo bancário.</small>
        </header>
        <div className="ca-section-heading">
          <div>
            <h2>Extrato de movimentações</h2>
            <p>
              {org.name} · {cycle} · {f.rows.length} transações
            </p>

          </div>
          <div className="ca-actions">
            {["ofx", "pdf", "txt"].map((kind) => (
              <Button
                key={kind}
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => void exportFile(kind)}
              >
                <Download size={14} />
                {kind.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
        {f.rows.length ? (
          <>
            <div className="ca-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descrição / cliente</th>
                    <th>Conta</th>
                    <th>Categoria</th>
                    <th>Situação</th>
                    <th className="ca-numeric">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {f.rows.map((t, i) => (
                    <tr
                      key={t.id}
                      className={i < current * 20 || i >= (current + 1) * 20 ? "ca-print-row" : ""}
                    >
                      <td>{t.date.slice(0, 10).split("-").reverse().join("/")}</td>
                      <td>
                        <strong>{t.description}</strong>
                        <small>{f.s.data.clients.find((c) => c.id === t.client_id)?.name}</small>
                      </td>
                      <td>
                        {f.s.data.accounts.find((a) => a.id === t.bank_account_id)?.name ?? "—"}
                      </td>
                      <td>{t.category ?? "Não categorizada"}</td>
                      <td>
                        <Status value={t.reconciliation_status} />
                      </td>
                      <td className={`ca-numeric ${t.amount < 0 ? "ca-debit" : "ca-credit"}`}>
                        {money(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ca-pagination">
              <span>
                Página {current + 1} de {pages}
              </span>
              <div className="ca-row">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={current >= pages - 1}
                  onClick={() => setPage(current + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        ) : (
          <Empty />
        )}
      </section>
      <p className="ca-note">
        PDF: abre a impressão formatada; escolha “Salvar como PDF”. OFX: selecione uma conta
        bancária. TXT: formato delimitado por ponto e vírgula.
      </p>
    </>
  );
}
function Reconciliation({ cycle }: { cycle: string }) {
  const f = useFiltered(cycle);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const rows = f.rows.filter((t) => t.reconciliation_status === "pending");
  const eligible = rows.filter((t) => t.ai_category_suggested);
  const ids = selected.filter((id) => eligible.some((t) => t.id === id));
  const suspended =
    f.s.data.organizations.find((o) => o.id === f.s.organizationId)?.status === "suspended";
  async function suggest() {
    setBusy(true);
    try {
      await f.s.suggest();
      toast.success(
        f.s.demo
          ? "Sugestões demonstrativas por regras geradas."
          : "Sugestões geradas. Confira antes de aprovar.",
      );
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    setBusy(true);
    try {
      await f.s.review(ids);
      setSelected([]);
      toast.success("Categorias aprovadas.");
    } catch (err) {
      notify(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="ca-ai-intro">
        <div className="ca-ai-orb">
          <Sparkles size={28} />
        </div>
        <div>
          <h2>Inteligência que sugere. Você que decide.</h2>
          <p>
            Revise as categorias financeiras antes de aprovar. As sugestões não representam
            escrituração contábil.
          </p>
        </div>
        <Button disabled={busy || !rows.length || suspended} onClick={() => void suggest()}>
          <Sparkles size={16} />
          {busy ? "Processando…" : "Sugerir categorias"}
        </Button>
      </div>
      {f.filters}
      <section className="ca-card">
        <div className="ca-section-heading">
          <div>
            <h2>Fila de revisão</h2>
            <p>
              {rows.length} pendentes · {eligible.length} com sugestão
            </p>
          </div>
          <Button disabled={busy || !ids.length || suspended} onClick={() => void approve()}>
            <CheckCircle2 size={16} />
            Aprovar selecionadas ({ids.length})
          </Button>
        </div>
        {rows.length ? (
          <div className="ca-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="Selecionar sugestões"
                      type="checkbox"
                      checked={eligible.length > 0 && ids.length === eligible.length}
                      onChange={(e) =>
                        setSelected(e.target.checked ? eligible.map((t) => t.id) : [])
                      }
                    />
                  </th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Sugestão</th>
                  <th>Revisão manual</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <input
                        aria-label={`Selecionar ${t.description}`}
                        type="checkbox"
                        disabled={!t.ai_category_suggested}
                        checked={ids.includes(t.id)}
                        onChange={(e) =>
                          setSelected((p) =>
                            e.target.checked ? [...p, t.id] : p.filter((id) => id !== t.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <strong>{t.description}</strong>
                      <small>{t.date.slice(0, 10)}</small>
                    </td>
                    <td>{money(t.amount)}</td>
                    <td>
                      {t.ai_category_suggested ? (
                        <span className="ca-badge success">
                          <Sparkles size={12} />
                          {t.ai_category_suggested}
                        </span>
                      ) : (
                        "Aguardando análise"
                      )}
                    </td>
                    <td>
                      <select
                        aria-label={`Categoria para ${t.description}`}
                        disabled={suspended}
                        value=""
                        onChange={(e) => {
                          if (e.target.value)
                            void f.s
                              .review([t.id], e.target.value)
                              .then(() => toast.success("Categoria aprovada."))
                              .catch(notify);
                        }}
                      >
                        <option value="">Selecionar categoria</option>
                        {categories.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Nenhuma transação pendente nesta seleção." />
        )}
      </section>
    </>
  );
}
function CashFlow({ cycle }: { cycle: string }) {
  const f = useFiltered(cycle);
  const summary = statementTotals(f.rows);
  const [generatedAt, setGeneratedAt] = useState(() => new Date());
  useEffect(() => {
    const prepare = () => flushSync(() => setGeneratedAt(new Date()));
    window.addEventListener("beforeprint", prepare);
    return () => window.removeEventListener("beforeprint", prepare);
  }, []);
  const selectedAccount = f.accounts.find((a) => a.id === f.account);
  const selectedItem = f.s.data.items.find((i) => i.id === f.bank);
  const selectedClient = f.s.data.clients.find((c) => c.id ===
    (f.client || selectedAccount?.client_id || selectedItem?.client_id));
  const periodEnd = new Date(Number(cycle.slice(0, 4)), Number(cycle.slice(5)), 0).getDate();
  const period = `01/${cycle.slice(5)}/${cycle.slice(0, 4)} a ${periodEnd}/${cycle.slice(5)}/${cycle.slice(0, 4)}`;
  const byCategory = categories
    .map((name) => ({
      name,
      total: f.rows.filter((t) => t.category === name).reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((c) => c.total !== 0);
  return (
    <>
      {f.filters}
      <div className="ca-alert info">
        <CircleHelp size={18} />
        Análise consultiva pós-fechamento. Transferências internas categorizadas são excluídas dos
        totais operacionais.
      </div>
      {summary.pending > 0 && (
        <div className="ca-alert warning">
          Há {summary.pending} transações sem revisão. Os resultados são preliminares.
        </div>
      )}
      <div className="ca-metrics three">
        <Metric
          label="Entradas operacionais"
          value={money(summary.inflow)}
          detail="Créditos do período"
          icon={ArrowDownLeft}
        />
        <Metric
          label="Saídas operacionais"
          value={money(summary.outflow)}
          detail="Débitos do período"
          icon={ArrowUpRight}
        />
        <Metric
          label="Resultado líquido do período"
          value={money(summary.net)}
          detail="Entradas menos saídas · Não é DRE contábil"
        />
      </div>
      <section className="ca-card">
        <div className="ca-section-heading">
          <div>
            <h2>Evolução diária do caixa</h2>
            <p>Movimentações operacionais na competência selecionada</p>
          </div>
        </div>
        <FlowChart rows={f.rows} />
      </section>
      <section className="ca-card">
        <div className="ca-section-heading">
          <h2>Movimentação por categoria</h2>
        </div>
        {byCategory.map((c) => (
          <div className="ca-detail-row" key={c.name}>
            <span>{c.name}</span>
            <strong className={c.total >= 0 ? "ca-credit" : "ca-debit"}>{money(c.total)}</strong>
          </div>
        ))}
        <div className="ca-detail-row">
          <span>Sem categoria</span>
          <strong>
            {money(f.rows.filter((t) => !t.category).reduce((sum, t) => sum + t.amount, 0))}
          </strong>
        </div>
      </section>
    </>
  );
}
function Configuration() {
  const s = useConcilia();
  const org = s.data.organizations.find((o) => o.id === s.organizationId)!;
  const plan = s.data.plans.find((p) => p.id === org.plan_id);
  const canEdit =
    s.demo ||
    s.data.members.some(
      (m) => m.user_id === s.user?.id && m.organization_id === org.id && m.role === "admin",
    );
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await s.saveOrganization(org.id, {
        name: String(f.get("name")),
        billing_email: String(f.get("email")),
        phone: String(f.get("phone")),
      });
      toast.success("Dados atualizados.");
    } catch (err) {
      notify(err);
    }
  }
  return (
    <div className="ca-dashboard-grid">
      <section className="ca-card">
        <div className="ca-section-heading">
          <div>
            <h2>Dados do escritório</h2>
            <p>Mantenha seus dados de contato atualizados.</p>
          </div>
        </div>
        <form onSubmit={save}>
          <Field label="Nome do escritório">
            <input name="name" required defaultValue={org.name} disabled={!canEdit} />
          </Field>
          <Field label="CNPJ">
            <input value={org.cnpj} disabled />
          </Field>
          <Field label="E-mail de cobrança">
            <input name="email" type="email" defaultValue={org.billing_email} disabled={!canEdit} />
          </Field>
          <Field label="Telefone">
            <input name="phone" defaultValue={org.phone} disabled={!canEdit} />
          </Field>
          <Button type="submit" disabled={!canEdit}>
            Salvar alterações
          </Button>
        </form>
      </section>
      <div>
        <section className="ca-card">
          <div className="ca-row">
            <h2>Sua licença</h2>
            <Status value={org.status} />
          </div>
          <h3>{plan?.name ?? "Plano não definido"}</h3>
          <p>
            {money(plan?.monthly_price ?? 0)} / mês · {plan?.included_items} itens incluídos
          </p>
          <p>{money(plan?.extra_item_price ?? 0)} por item excedente</p>
          <small>Fale com o administrador para alteração de plano ou regularização.</small>
        </section>
        <section className="ca-card">
          <h2>Equipe do escritório</h2>
          {s.data.members
            .filter((m) => m.organization_id === org.id)
            .map((m) => (
              <div key={m.id} className="ca-detail-row">
                <span>{m.user_id === s.user?.id ? s.user.email : m.user_id}</span>
                <span className="ca-badge neutral">{m.role}</span>
              </div>
            ))}
          <small>
            A concessão de acesso é feita pelo administrador por meio do procedimento seguro
            descrito na documentação do projeto.
          </small>
        </section>
      </div>
    </div>
  );
}
function AdminPage({ page, cycle }: { page: string; cycle: string }) {
  const s = useConcilia();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [creating, setCreating] = useState(false);
  const [volume, setVolume] = useState(50);
  const all = s.data.organizations.map((org) => {
    const plan = s.data.plans.find((p) => p.id === org.plan_id);
    return { org, plan, calc: plan ? billing(plan, billableCount(s.data, org.id, cycle)) : null };
  });
  const filtered = all.filter(
    (r) =>
      r.org.name.toLowerCase().includes(query.toLowerCase()) &&
      (!status || r.org.status === status) &&
      (!planFilter || r.org.plan_id === planFilter),
  );
  const total = all.reduce((a, r) => a + (r.calc?.total ?? 0), 0);
  const extras = all.reduce((a, r) => a + (r.calc?.extra ?? 0), 0);
  const count = all.reduce((a, r) => a + (r.calc?.count ?? 0), 0);
  const riskItems = all
    .filter((r) => r.org.status !== "active")
    .reduce((a, r) => a + (r.calc?.count ?? 0), 0);
  const percent = (value: string) =>
    `${((all.filter((r) => r.org.status === value).length / (all.length || 1)) * 100).toFixed(1)}%`;
  async function update(org: Organization, value: Partial<Organization>) {
    try {
      await s.saveOrganization(org.id, value);
      toast.success("Escritório atualizado.");
    } catch (err) {
      notify(err);
    }
  }
  async function savePlan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    try {
      await s.savePlan({
        ...editing,
        name: String(f.get("name")),
        included_items: Number(f.get("included_items")),
        monthly_price: Number(f.get("monthly_price")),
        extra_item_price: Number(f.get("extra_item_price")),
      });
      setEditing(null);
      toast.success("Plano atualizado.");
    } catch (err) {
      notify(err);
    }
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await s.createOrganization({
        name: String(f.get("name")),
        cnpj: String(f.get("cnpj")),
        billing_email: String(f.get("email")),
        phone: "",
        plan_id: String(f.get("plan")),
        status: "active",
      });
      setCreating(false);
      toast.success(
        "Escritório cadastrado. Vincule seus usuários pelo procedimento administrativo.",
      );
    } catch (err) {
      notify(err);
    }
  }
  if (page === "planos")
    return (
      <>
        <div className="ca-metrics three">
          {s.data.plans.map((p) => (
            <section className="ca-card ca-price-card" key={p.id}>
              <span className="ca-eyebrow">PLANO {p.name.toUpperCase()}</span>
              <h2>
                {money(p.monthly_price)}
                <small>/mês</small>
              </h2>
              <p>
                <strong>{p.included_items} itens bancários</strong> incluídos
              </p>
              <p>{money(p.extra_item_price)} por item excedente</p>
              <Button variant="outline" onClick={() => setEditing(p)}>
                Editar plano
              </Button>
            </section>
          ))}
        </div>
        <section className="ca-card">
          <div className="ca-section-heading">
            <div>
              <h2>Simulador de faturamento</h2>
              <p>Compare o custo total pelo volume de itens bancários.</p>
            </div>
            <Field label="Quantidade de itens">
              <input
                type="number"
                min={0}
                max={1000000}
                value={volume}
                onChange={(e) => setVolume(Math.max(0, Math.min(1000000, Number(e.target.value))))}
              />
            </Field>
          </div>
          <div className="ca-metrics three">
            {s.data.plans.map((p) => (
              <Metric
                key={p.id}
                label={p.name}
                value={money(billing(p, volume).total)}
                detail={`${billing(p, volume).extraItems} itens excedentes`}
              />
            ))}
          </div>
        </section>
        {editing && (
          <Modal title={`Editar ${editing.name}`} close={() => setEditing(null)}>
            <form onSubmit={savePlan}>
              {[
                ["name", "Nome", editing.name],
                ["included_items", "Itens incluídos", editing.included_items],
                ["monthly_price", "Mensalidade", editing.monthly_price],
                ["extra_item_price", "Valor excedente", editing.extra_item_price],
              ].map(([key, label, value]) => (
                <Field key={key} label={String(label)}>
                  <input
                    name={String(key)}
                    defaultValue={value}
                    type={key === "name" ? "text" : "number"}
                    step={key === "included_items" ? 1 : ".01"}
                    min={key === "included_items" ? 1 : 0}
                    required
                  />
                </Field>
              ))}
              <Button type="submit">Salvar plano</Button>
            </form>
          </Modal>
        )}
      </>
    );
  return (
    <>
      {page === "dashboard" && (
        <>
          <div className="ca-metrics">
            <Metric
              label="Escritórios cadastrados"
              value={all.length}
              detail="Licenças na plataforma"
              icon={Building2}
            />
            <Metric
              label="Itens no ciclo"
              value={count}
              detail="Itens distintos com sincronização válida"
              icon={Link2}
            />
            <Metric
              label="MRR base"
              value={money(total - extras)}
              detail="Mensalidades contratadas"
            />
            <Metric
              label="Faturamento projetado"
              value={money(total)}
              detail={`${money(extras)} em excedentes`}
            />
          </div>
          <div className="ca-metrics">
            <Metric
              label="Atraso em carência"
              value={percent("past_due")}
              detail="Licenças past_due / total"
            />
            <Metric
              label="Inadimplência crítica"
              value={percent("suspended")}
              detail="Licenças suspensas / total"
            />
            <Metric
              label="Custo efetivo Pluggy"
              value={money(count * s.data.costPerItem)}
              detail={`${money(s.data.costPerItem)} por item no ciclo`}
            />
            <Metric
              label="Custo em risco"
              value={money(riskItems * s.data.costPerItem)}
              detail="Itens de licenças em carência ou suspensas"
            />
          </div>
        </>
      )}
      {page !== "dashboard" && (
        <div className="ca-toolbar">
          <div className="ca-search">
            <Search size={16} />
            <input
              aria-label="Buscar escritórios"
              placeholder="Buscar escritório…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            aria-label="Status da licença"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="past_due">Em carência</option>
            <option value="suspended">Suspensos</option>
          </select>
          <select
            aria-label="Plano"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">Todos os planos</option>
            {s.data.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {page === "escritorios" ? (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} />
              Novo escritório
            </Button>
          ) : (
            <Button
              onClick={() =>
                download(
                  `faturamento-${cycle}.csv`,
                  billingCsv(
                    filtered.map((r) => ({
                      name: r.org.name,
                      count: r.calc?.count ?? 0,
                      base: r.plan?.monthly_price ?? 0,
                      extra: r.calc?.extra ?? 0,
                      total: r.calc?.total ?? 0,
                    })),
                  ),
                  "text/csv;charset=utf-8",
                )
              }
            >
              <Download size={16} />
              Exportar CSV
            </Button>
          )}
        </div>
      )}
      <section className="ca-card">
        <div className="ca-section-heading">
          <div>
            <h2>
              {page === "dashboard"
                ? "Maiores excedentes do ciclo"
                : page === "faturamento"
                  ? "Apuração mensal por escritório"
                  : "Gestão de escritórios"}
            </h2>
            <p>
              {page === "faturamento"
                ? "Apuração gerencial; não dispara cobrança ou movimenta pagamentos."
                : "Acompanhe licenças, consumo e evolução da plataforma."}
            </p>
          </div>
        </div>
        <div className="ca-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Escritório</th>
                <th>Plano</th>
                <th>Situação</th>
                <th>Clientes</th>
                <th>Itens</th>
                <th>Excedente</th>
                <th>Total</th>
                {page === "escritorios" && <th>Licença</th>}
              </tr>
            </thead>
            <tbody>
              {(page === "dashboard"
                ? [...all].sort((a, b) => (b.calc?.extra ?? 0) - (a.calc?.extra ?? 0)).slice(0, 5)
                : filtered
              ).map((r) => (
                <tr key={r.org.id}>
                  <td>
                    <strong>{r.org.name}</strong>
                    <small>{r.org.cnpj}</small>
                  </td>
                  <td>
                    {page === "escritorios" ? (
                      <select
                        aria-label={`Plano de ${r.org.name}`}
                        value={r.org.plan_id}
                        onChange={(e) => void update(r.org, { plan_id: e.target.value })}
                      >
                        {s.data.plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      r.plan?.name
                    )}
                  </td>
                  <td>
                    <Status value={r.org.status} />
                  </td>
                  <td>{s.data.clients.filter((c) => c.organization_id === r.org.id).length}</td>
                  <td>{r.calc?.count ?? 0}</td>
                  <td>{money(r.calc?.extra ?? 0)}</td>
                  <td>{money(r.calc?.total ?? 0)}</td>
                  {page === "escritorios" && (
                    <td>
                      <select
                        aria-label={`Licença de ${r.org.name}`}
                        value={r.org.status}
                        onChange={(e) =>
                          void update(r.org, { status: e.target.value as Organization["status"] })
                        }
                      >
                        <option value="active">Ativo</option>
                        <option value="past_due">Em carência</option>
                        <option value="suspended">Suspenso</option>
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Empty />}
        </div>
      </section>
      {creating && (
        <Modal title="Novo escritório" close={() => setCreating(false)}>
          <form onSubmit={create}>
            <Field label="Nome">
              <input name="name" required />
            </Field>
            <Field label="CNPJ">
              <input name="cnpj" required />
            </Field>
            <Field label="E-mail de cobrança">
              <input name="email" type="email" required />
            </Field>
            <Field label="Plano">
              <select name="plan">
                {s.data.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit">Cadastrar escritório</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
