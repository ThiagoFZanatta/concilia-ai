/** Runtime declarations for offline TypeScript checks; deployment uses Lovable Cloud's Deno runtime. */
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
}
