import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterPage } from "@/routes/register";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  const React = await import("react");
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) =>
      React.createElement("a", { href: to }, children),
    useNavigate: () => mocks.navigate,
  };
});

vi.mock("@/services/auth-service", () => ({
  getAuthService: () => ({ signUp: mocks.signUp }),
}));

describe("registration form", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.signUp.mockReset();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("sends only one signup request for repeated submits while a request is pending", async () => {
    let resolveSignup!: (value: {
      emailVerificationRequired: boolean;
      accountMayAlreadyExist: boolean;
    }) => void;
    mocks.signUp.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignup = resolve;
        }),
    );
    render(createElement(RegisterPage));

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secure-passphrase" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secure-passphrase" },
    });
    fireEvent.click(screen.getByRole("checkbox"));

    const form = screen.getByRole("button", { name: "Create Account" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "secure-passphrase",
      displayName: "Test User",
    });

    resolveSignup({ emailVerificationRequired: true, accountMayAlreadyExist: false });
    expect(await screen.findByRole("status")).toHaveTextContent("Check your email to verify");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("continues into the app when Supabase immediately creates a session", async () => {
    mocks.signUp.mockResolvedValue({
      emailVerificationRequired: false,
      accountMayAlreadyExist: false,
    });
    render(createElement(RegisterPage));

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secure-passphrase" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "secure-passphrase" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    const form = screen.getByRole("button", { name: "Create Account" }).closest("form");

    fireEvent.submit(form!);

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard" }));
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard" });
  });
});
