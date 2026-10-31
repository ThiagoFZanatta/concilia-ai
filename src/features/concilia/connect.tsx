import { useState } from "react";
import { Activity, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cloud } from "./data";

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
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  async function connect() {
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
      setName(data.organizationName);
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
            : `${name ? `O escritório ${name}` : "Seu escritório contábil"} solicita autorização para coletar e organizar seus extratos bancários.`}
        </p>
        {!success && (
          <>
            <ol>
              <li>Abra o ambiente seguro de conexão.</li>
              <li>Escolha seu banco e autorize o compartilhamento.</li>
              <li>Seu escritório receberá os extratos após a sincronização.</li>
            </ol>
            <Button onClick={() => void connect()} disabled={busy}>
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
