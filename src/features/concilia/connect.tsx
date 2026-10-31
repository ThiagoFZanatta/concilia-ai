import { useEffect, useState } from "react";
import { Activity, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloud } from "./data";
import { formatDocument } from "./domain";

declare global {
  interface Window {
    PluggyConnect?: new (options: {
      connectToken: string;
      updateItem?: string;
      includeSandbox: boolean;
      onSuccess: (result: { item: { id: string } }) => void;
      onError: (error: unknown) => void;
      onClose: () => void;
    }) => { init: () => void };
  }
}
async function widgetScript() {
  if (window.PluggyConnect) return;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.pluggy.ai/pluggy-connect/v2.3.1/pluggy-connect.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Não foi possível carregar o ambiente seguro do banco."));
    document.head.appendChild(script);
  });
}
export function Connect({ token }: { token: string }) {
  const [identity, setIdentity] = useState<{ organizationName: string; clientName: string; clientDocument: string } | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    let active = true;
    setIdentity(null);
    setConsent(false);
    setSuccess(false);
    setError("");
    if (token.startsWith("demo-")) {
      setError("Este é um link de demonstração e não permite conexão bancária.");
      return;
    }
    void cloud.functions.invoke("bank-connect", { body: { token, action: "info" } })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || data?.error || !data?.clientName || !data?.organizationName)
          throw new Error("Convite indisponível ou expirado. Solicite um novo link ao escritório.");
        setIdentity(data);
      })
      .catch(() => { if (active) setError("Convite indisponível ou expirado. Solicite um novo link ao escritório."); });
    return () => { active = false; };
  }, [token]);
  async function connect() {
    if (!consent || !identity || busy) return;
    setBusy(true);
    setError("");
    try {
      if (token.startsWith("demo-"))
        throw new Error("Este é um link de demonstração e não permite conexão bancária.");
      const { data, error } = await cloud.functions.invoke("bank-connect", {
        body: { token, action: "connect" },
      });
      if (error)
        throw new Error(
          "Convite indisponível ou integração não configurada. Solicite um novo link ao escritório.",
        );
      if (data.error) throw new Error(data.error);

      await widgetScript();
      if (!window.PluggyConnect) throw new Error("Widget bancário indisponível.");
      new window.PluggyConnect({
        connectToken: data.connectToken,
        ...(data.updateItem ? { updateItem: data.updateItem } : {}),
        includeSandbox: false,
        onSuccess: (result) => {
          void cloud.functions
            .invoke("bank-connect", { body: { token, action: "complete", itemId: result.item.id } })
            .then(({ data, error }) => {
              if (error || data?.error)
                throw new Error(data?.error ?? "Não foi possível confirmar a conexão.");
              setSuccess(true);
            })
            .catch((e) => setError(e instanceof Error ? e.message : "Falha ao confirmar."))
            .finally(() => setBusy(false));
        },
        onError: () => {
          setError("A conexão não foi concluída. Tente novamente ou fale com o escritório.");
          setBusy(false);
        },
        onClose: () => setBusy(false),
      }).init();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha de conexão.");
      setBusy(false);
    }
  }
  return (
    <main className="ca-connect">
      <div className="ca-brand">
        <span>
          <Activity />
        </span>
        concilia<span className="ca-ai">AI</span>
      </div>
      <section className="ca-card">
        <div className="ca-connect-icon">
          {success ? <CheckCircle2 size={36} /> : <ShieldCheck size={36} />}
        </div>
        <span className="ca-eyebrow">CONEXÃO BANCÁRIA SEGURA</span>
        <h1>{success ? "Autorização recebida." : "Seu banco conectado ao seu escritório."}</h1>
        <p>
          {success
            ? "Sua conexão foi confirmada e os extratos serão sincronizados. Você já pode fechar esta página."
            : `${identity ? `O escritório ${identity.organizationName}` : "Seu escritório contábil"} solicita autorização para coletar e organizar seus extratos bancários.`}
        </p>
        {identity && !success && (
          <div className="ca-connect-identity">
            <strong>{identity.organizationName}</strong>
            <p>Empresa vinculada: <strong>{identity.clientName}</strong></p>
            <p>CNPJ/CPF: {formatDocument(identity.clientDocument)}</p>
          </div>
        )}
        {!identity && !error && <p role="status">Verificando convite…</p>}
        {!success && (
          <>
            <ol>
              <li>Abra o ambiente seguro de conexão.</li>
              <li>Escolha seu banco e autorize o compartilhamento.</li>
              <li>Seu escritório receberá os extratos após a sincronização.</li>
            </ol>
            <section className="ca-consent" aria-label="Compartilhamento de dados e consentimento">
              <h2>Transparência e proteção dos seus dados</h2>
              <p><strong>O que será compartilhado:</strong> saldos e histórico de movimentações bancárias das contas selecionadas.</p>
              <p><strong>O que esta conexão não autoriza:</strong> transferências, pagamentos ou contratação de crédito. O escritório não solicita suas senhas bancárias. Confira os dados e permissões apresentados pela instituição antes de autorizar.</p>
              <p>Ao prosseguir com a conexão, você autoriza o compartilhamento dos extratos bancários exclusivamente para fins de conciliação contábil, fiscal e consultoria financeira conduzida por <strong>{identity?.organizationName ?? "seu escritório"}</strong>, observando a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).</p>
              <label className="ca-consent-check">
                <input type="checkbox" checked={consent} disabled={!identity || busy}
                  onChange={(e) => setConsent(e.target.checked)} />
                Li as informações e autorizo o compartilhamento para as finalidades descritas.
              </label>
            </section>
            <Button onClick={() => void connect()} disabled={busy || !identity || !consent}>
              {busy ? "Conectando…" : "Autorizar conexão bancária"}
            </Button>
          </>
        )}
        {error && (
          <p className="ca-error" role="alert">
            {error}
          </p>
        )}
        <small>
          Suas credenciais são informadas no ambiente seguro da integração bancária. O Concilia AI
          não solicita senhas por e-mail ou WhatsApp.
        </small>
      </section>
    </main>
  );
}
