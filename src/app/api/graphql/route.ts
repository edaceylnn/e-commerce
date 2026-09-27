import { createYoga } from "graphql-yoga";
import type { NextRequest } from "next/server";
import { schema } from "@/lib/graphql/schema";
import { getSession } from "@/lib/auth";

const yoga = createYoga({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
  context: async () => {
    const session = await getSession();
    return { userId: session?.userId ?? null };
  },
});

// Wrapped in plain functions (rather than re-exporting handleRequest
// directly) so the signature matches what Next.js's route type validator
// expects — graphql-yoga's own handler type doesn't line up structurally.
export async function GET(request: NextRequest) {
  return yoga.handleRequest(request, {});
}

export async function POST(request: NextRequest) {
  return yoga.handleRequest(request, {});
}

export async function OPTIONS(request: NextRequest) {
  return yoga.handleRequest(request, {});
}
