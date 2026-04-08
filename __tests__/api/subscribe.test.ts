import { POST } from "@/app/api/subscribe/route";

// Mock the db module
jest.mock("@/lib/db", () => ({
  addSubscriber: jest.fn(),
}));

import { addSubscriber } from "@/lib/db";
const mockAddSubscriber = addSubscriber as jest.MockedFunction<typeof addSubscriber>;

function makeRequest(body: any, ip = "127.0.0.1"): Request {
  return new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/subscribe", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("accepts a valid email and returns 201", async () => {
    mockAddSubscriber.mockReturnValue(true);
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockAddSubscriber).toHaveBeenCalledWith("test@example.com");
  });

  test("returns 200 for duplicate email (no leak)", async () => {
    mockAddSubscriber.mockReturnValue(false);
    const res = await POST(makeRequest({ email: "test@example.com" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });

  test("rejects invalid email with 400", async () => {
    const res = await POST(makeRequest({ email: "notanemail" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid email address");
  });

  test("rejects missing email with 400", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  test("rejects empty string email with 400", async () => {
    const res = await POST(makeRequest({ email: "" }));
    expect(res.status).toBe(400);
  });
});
