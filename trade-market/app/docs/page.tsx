import { Card } from "@/components/ui/card";

const publicOps = ["POST /query: login", "POST /query: register", "GET /public/ping", "GET / (GraphQL Playground)"];
const protectedOps = [
  "POST /query: logout",
  "POST /query: getProducts",
  "POST /query: setProduct",
  "POST /query: getUsers (backend available, UI not used in trade-market)",
  "POST /query: setCategory (backend available, UI not used in trade-market)",
];

export default function DocsPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-4">
      <p className="section-kicker">API Scope</p>

      <Card className="p-6">
        <h1 className="mb-3 font-mono text-2xl uppercase tracking-wide">Trade Market Integration Notes</h1>
        <p className="text-sm text-muted-foreground">
          В `trade-market` реализованы только сценарии, которые подтверждены в `apps/API_SHORT.md`:
          login/register/logout/getProducts/setProduct/ping.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">Public</h2>
          <ul className="space-y-2 text-sm text-foreground">
            {publicOps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-muted-foreground">Protected</h2>
          <ul className="space-y-2 text-sm text-foreground">
            {protectedOps.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}
