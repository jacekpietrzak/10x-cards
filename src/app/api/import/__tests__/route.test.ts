import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the service and the admin client so these tests exercise only the route
// handler's auth / config / validation / wiring — not the CRUD phase logic
// (covered by flashcards.service.test.ts) or a real Supabase connection.
vi.mock("@/lib/services/flashcards.service", () => ({
  processImportRequest: vi.fn(),
  listManualFlashcards: vi.fn(),
}));
vi.mock("@/utils/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({})),
}));

import { GET, POST } from "../route";
import {
  listManualFlashcards,
  processImportRequest,
} from "@/lib/services/flashcards.service";
import { createAdminClient } from "@/utils/supabase/admin";

const mockedImport = vi.mocked(processImportRequest);
const mockedList = vi.mocked(listManualFlashcards);
const mockedAdmin = vi.mocked(createAdminClient);

/** The five-field response shape, with every counter zeroed. */
const EMPTY_RESULT = {
  inserted: 0,
  updated: 0,
  deleted: 0,
  patched: 0,
  skipped_patches: [],
};

const VALID_KEY = "test-secret-key-with-plenty-of-entropy";
const USER_ID = "import-user-uuid-123";

/** Build a POST request to /api/import with a JSON body and optional headers. */
function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("http://localhost/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** Authorization header carrying the valid bearer token. */
const authHeader = { Authorization: `Bearer ${VALID_KEY}` };

describe("POST /api/import", () => {
  beforeEach(() => {
    // The route reads these at request time, so set them per test.
    process.env.IMPORT_API_KEY = VALID_KEY;
    process.env.IMPORT_USER_ID = USER_ID;
    mockedImport.mockReset();
    mockedImport.mockResolvedValue({ ...EMPTY_RESULT });
    mockedAdmin.mockClear();
  });

  it("happy path: valid key + valid cards → 200 with the service result, calls processImportRequest with (payload, IMPORT_USER_ID)", async () => {
    mockedImport.mockResolvedValue({
      ...EMPTY_RESULT,
      inserted: 2,
      updated: 1,
    });

    const res = await POST(
      makeRequest(
        { cards: [{ front: "Q1", back: "A1" }, { front: "Q2", back: "A2" }] },
        authHeader,
      ),
    );

    expect(res.status).toBe(200);
    // The five-field response is passed through verbatim.
    expect(await res.json()).toEqual({
      ...EMPTY_RESULT,
      inserted: 2,
      updated: 1,
    });

    expect(mockedImport).toHaveBeenCalledTimes(1);
    // The route hands the whole validated payload to the orchestrator, which
    // owns the delete → patch → upsert phase order.
    const [payloadArg, userIdArg, clientArg] = mockedImport.mock.calls[0];
    expect(payloadArg).toEqual({
      cards: [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
      ],
    });
    expect(userIdArg).toBe(USER_ID);
    // The service-role client (mocked) is passed through.
    expect(clientArg).toBeDefined();
    expect(mockedAdmin).toHaveBeenCalledTimes(1);
  });

  it("missing Authorization header → 401, service not called", async () => {
    const res = await POST(makeRequest({ cards: [{ front: "f", back: "b" }] }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockedImport).not.toHaveBeenCalled();
  });

  it("wrong token → 401, service not called", async () => {
    const res = await POST(
      makeRequest(
        { cards: [{ front: "f", back: "b" }] },
        { Authorization: "Bearer the-wrong-key" },
      ),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockedImport).not.toHaveBeenCalled();
  });

  it("fail closed: IMPORT_API_KEY unset → 401 even with a bearer token, service not called", async () => {
    delete process.env.IMPORT_API_KEY;

    const res = await POST(
      makeRequest({ cards: [{ front: "f", back: "b" }] }, authHeader),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockedImport).not.toHaveBeenCalled();
  });

  it("oversized back (>500) → 400, service not called (whole-batch rejection)", async () => {
    const res = await POST(
      makeRequest(
        { cards: [{ front: "ok", back: "x".repeat(501) }] },
        authHeader,
      ),
    );

    expect(res.status).toBe(400);
    expect(mockedImport).not.toHaveBeenCalled();
  });

  it("backward compat: legacy cards-only body → 200 five-field response with zeroed new counters", async () => {
    mockedImport.mockResolvedValue({ ...EMPTY_RESULT, inserted: 1 });

    const res = await POST(
      makeRequest({ cards: [{ front: "f", back: "b" }] }, authHeader),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    // Strict superset of the old { inserted, updated } contract.
    expect(body).toEqual({
      inserted: 1,
      updated: 0,
      deleted: 0,
      patched: 0,
      skipped_patches: [],
    });
    // The validated payload carries no delete_fronts/patches keys — the
    // orchestrator sees exactly what a pre-CRUD caller sent.
    const [payloadArg] = mockedImport.mock.calls[0];
    expect(payloadArg).toEqual({ cards: [{ front: "f", back: "b" }] });
  });

  it("combined request: all three arrays pass through to the orchestrator, result returned verbatim", async () => {
    const serviceResult = {
      inserted: 1,
      updated: 2,
      deleted: 3,
      patched: 1,
      skipped_patches: [
        { old_front: "stale", reason: "old_front_not_found" as const },
      ],
    };
    mockedImport.mockResolvedValue(serviceResult);

    const res = await POST(
      makeRequest(
        {
          cards: [{ front: "up", back: "b" }],
          delete_fronts: ["bye"],
          patches: [{ old_front: "old", new_front: "new", new_back: "nb" }],
        },
        authHeader,
      ),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(serviceResult);

    const [payloadArg, userIdArg] = mockedImport.mock.calls[0];
    expect(payloadArg).toEqual({
      cards: [{ front: "up", back: "b" }],
      delete_fronts: ["bye"],
      patches: [{ old_front: "old", new_front: "new", new_back: "nb" }],
    });
    expect(userIdArg).toBe(USER_ID);
  });

  describe("request-level validation (superRefine)", () => {
    it.each([
      ["empty object {}", {}],
      ["all arrays empty", { cards: [], delete_fronts: [], patches: [] }],
    ])("all-empty request (%s) → 400, service not called", async (_label, body) => {
      const res = await POST(makeRequest(body, authHeader));

      expect(res.status).toBe(400);
      const { error } = await res.json();
      expect(JSON.stringify(error)).toContain(
        "At least one of cards, delete_fronts, or patches must be non-empty",
      );
      expect(mockedImport).not.toHaveBeenCalled();
    });

    it("delete_fronts overlapping cards[].front → 400 with the disjointness message", async () => {
      const res = await POST(
        makeRequest(
          {
            cards: [{ front: "Shared", back: "b" }],
            delete_fronts: ["Shared"],
          },
          authHeader,
        ),
      );

      expect(res.status).toBe(400);
      const { error } = await res.json();
      expect(JSON.stringify(error)).toContain(
        "delete_fronts must be disjoint from cards[].front",
      );
      expect(mockedImport).not.toHaveBeenCalled();
    });

    it("delete_fronts overlapping patches[].old_front → 400 with the disjointness message", async () => {
      const res = await POST(
        makeRequest(
          {
            patches: [{ old_front: "Shared", new_front: "n", new_back: "b" }],
            delete_fronts: ["Shared"],
          },
          authHeader,
        ),
      );

      expect(res.status).toBe(400);
      const { error } = await res.json();
      expect(JSON.stringify(error)).toContain(
        "delete_fronts must be disjoint from patches[].old_front",
      );
      expect(mockedImport).not.toHaveBeenCalled();
    });

    it("overlap is detected post-trim (transforms run before refinements)", async () => {
      const res = await POST(
        makeRequest(
          {
            cards: [{ front: "Shared", back: "b" }],
            delete_fronts: ["  Shared  "],
          },
          authHeader,
        ),
      );

      expect(res.status).toBe(400);
      expect(mockedImport).not.toHaveBeenCalled();
    });

    it.each([
      [
        "delete_fronts",
        { delete_fronts: Array.from({ length: 101 }, (_, i) => `f${i}`) },
      ],
      [
        "patches",
        {
          patches: Array.from({ length: 101 }, (_, i) => ({
            old_front: `o${i}`,
            new_front: `n${i}`,
            new_back: "b",
          })),
        },
      ],
    ])("%s array over the 100-entry cap → 400, service not called", async (_label, body) => {
      const res = await POST(makeRequest(body, authHeader));

      expect(res.status).toBe(400);
      expect(mockedImport).not.toHaveBeenCalled();
    });

    it("delete-only request is valid → 200 (no longer a shimmed no-op)", async () => {
      mockedImport.mockResolvedValue({ ...EMPTY_RESULT, deleted: 2 });

      const res = await POST(
        makeRequest({ delete_fronts: ["a", "b"] }, authHeader),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ...EMPTY_RESULT, deleted: 2 });
      const [payloadArg] = mockedImport.mock.calls[0];
      expect(payloadArg).toEqual({ delete_fronts: ["a", "b"] });
    });

    it("patch-only request is valid → 200", async () => {
      mockedImport.mockResolvedValue({ ...EMPTY_RESULT, patched: 1 });

      const res = await POST(
        makeRequest(
          { patches: [{ old_front: "o", new_front: "n", new_back: "b" }] },
          authHeader,
        ),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ...EMPTY_RESULT, patched: 1 });
    });
  });

  it("body supplies user_id at both the top level and inside a card → still uses IMPORT_USER_ID, never the body value (both Zod strip sites)", async () => {
    const res = await POST(
      makeRequest(
        {
          user_id: "evil-top-level",
          cards: [{ front: "f", back: "b", user_id: "evil-card-level" }],
        },
        authHeader,
      ),
    );

    expect(res.status).toBe(200);
    expect(mockedImport).toHaveBeenCalledTimes(1);

    const [payloadArg, userIdArg] = mockedImport.mock.calls[0];
    // Top-level strip: the user id passed to the service is the env value, and
    // the payload the orchestrator receives carries no user_id of its own.
    expect(userIdArg).toBe(USER_ID);
    expect(userIdArg).not.toBe("evil-top-level");
    expect(payloadArg).not.toHaveProperty("user_id");
    // Card-level strip: the card object carries only front/back, no user_id.
    expect(payloadArg.cards).toEqual([{ front: "f", back: "b" }]);
    expect(payloadArg.cards?.[0]).not.toHaveProperty("user_id");
  });

  describe("error paths", () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it("IMPORT_USER_ID unset (but auth valid) → 500 server misconfiguration, service not called", async () => {
      delete process.env.IMPORT_USER_ID;

      const res = await POST(
        makeRequest({ cards: [{ front: "f", back: "b" }] }, authHeader),
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Server misconfiguration" });
      expect(mockedImport).not.toHaveBeenCalled();
    });

    it("malformed JSON body → 400", async () => {
      const req = new Request("http://localhost/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: "{ not valid json",
      });

      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid JSON body" });
      expect(mockedImport).not.toHaveBeenCalled();
    });

    it("service throws → 500 catch-all", async () => {
      mockedImport.mockRejectedValue(new Error("db unreachable"));

      const res = await POST(
        makeRequest({ cards: [{ front: "f", back: "b" }] }, authHeader),
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "An error occurred while importing flashcards.",
      });
    });
  });
});

/** The three-field read response, empty. */
const EMPTY_LIST = { cards: [], count: 0, truncated: false };

/** Build a GET request to /api/import with optional headers. */
function makeGetRequest(headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/import", {
    method: "GET",
    headers,
  });
}

describe("GET /api/import", () => {
  beforeEach(() => {
    process.env.IMPORT_API_KEY = VALID_KEY;
    process.env.IMPORT_USER_ID = USER_ID;
    mockedList.mockReset();
    mockedList.mockResolvedValue({ ...EMPTY_LIST });
    mockedAdmin.mockClear();
  });

  it("happy path: valid key → 200 with the service result verbatim, calls listManualFlashcards with (IMPORT_USER_ID, admin client)", async () => {
    const listResult = {
      cards: [
        { front: "Q1", back: "A1" },
        { front: "Q2", back: "A2" },
      ],
      count: 2,
      truncated: false,
    };
    mockedList.mockResolvedValue(listResult);

    const res = await GET(makeGetRequest(authHeader));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(listResult);

    expect(mockedList).toHaveBeenCalledTimes(1);
    const [userIdArg, clientArg] = mockedList.mock.calls[0];
    expect(userIdArg).toBe(USER_ID);
    expect(clientArg).toBe(mockedAdmin.mock.results[0].value);
  });

  it("empty DB → 200 with { cards: [], count: 0, truncated: false }, never a 4xx", async () => {
    const res = await GET(makeGetRequest(authHeader));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(EMPTY_LIST);
  });

  it("missing Authorization header → 401, service not called", async () => {
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("wrong token → 401", async () => {
    const res = await GET(
      makeGetRequest({ Authorization: "Bearer wrong-token" }),
    );

    expect(res.status).toBe(401);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("non-Bearer scheme → 401", async () => {
    const res = await GET(
      makeGetRequest({
        Authorization: `Basic ${Buffer.from(`u:${VALID_KEY}`).toString("base64")}`,
      }),
    );

    expect(res.status).toBe(401);
    expect(mockedList).not.toHaveBeenCalled();
  });

  describe("error paths", () => {
    let errorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it("IMPORT_API_KEY unset → 401 fail-closed, even with a header present", async () => {
      delete process.env.IMPORT_API_KEY;

      const res = await GET(makeGetRequest(authHeader));

      expect(res.status).toBe(401);
      expect(mockedList).not.toHaveBeenCalled();
    });

    it("IMPORT_USER_ID unset (but auth valid) → 500 server misconfiguration, service not called", async () => {
      delete process.env.IMPORT_USER_ID;

      const res = await GET(makeGetRequest(authHeader));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Server misconfiguration" });
      expect(mockedList).not.toHaveBeenCalled();
    });

    it("service throws → 500 catch-all with the GET-specific message", async () => {
      mockedList.mockRejectedValue(new Error("db unreachable"));

      const res = await GET(makeGetRequest(authHeader));

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "An error occurred while listing flashcards.",
      });
    });
  });
});
