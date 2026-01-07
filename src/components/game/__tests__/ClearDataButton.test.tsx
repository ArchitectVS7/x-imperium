import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClearDataButton } from "../ClearDataButton";

describe("ClearDataButton", () => {
  const mockFetch = vi.fn();
  const mockLocation = { href: "" };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch
    global.fetch = mockFetch;

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without crashing", () => {
    render(<ClearDataButton />);
    expect(screen.getByRole("button", { name: /clear corrupted data/i })).toBeInTheDocument();
  });

  it("displays correct button text", () => {
    render(<ClearDataButton />);
    expect(screen.getByText("Clear corrupted data")).toBeInTheDocument();
  });

  it("has correct button styling", () => {
    render(<ClearDataButton />);

    const button = screen.getByRole("button", { name: /clear corrupted data/i });
    expect(button).toHaveClass("text-red-400");
    expect(button).toHaveClass("underline");
  });

  describe("Confirmation dialog", () => {
    it("shows confirmation modal when clicked", async () => {
      render(<ClearDataButton />);

      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Modal should appear with title and message
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
        expect(screen.getByText("Are you sure you want to clear all game data and start fresh?")).toBeInTheDocument();
      });
    });

    it("does not make API calls if user cancels", async () => {
      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });

      // Click cancel button
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("API calls", () => {
    it("calls both clear endpoints when confirmed", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });

      // Click confirm button
      fireEvent.click(screen.getByRole("button", { name: /clear data/i }));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/admin/clear-games", { method: "POST" });
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/clear-cookies", { method: "POST" });
    });

    it("redirects to game page with newGame param on success", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear and click confirm
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /clear data/i }));

      await waitFor(() => {
        expect(mockLocation.href).toBe("/game?newGame=true");
      });
    });
  });

  describe("Loading state", () => {
    it("shows loading state while clearing", async () => {
      // Create a promise that we can control
      let resolvePromise: (value: { ok: boolean }) => void;
      const pendingPromise = new Promise<{ ok: boolean }>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValue(pendingPromise);

      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear and click confirm
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /clear data/i }));

      // The trigger button should show loading state
      expect(screen.getByText("Clearing...")).toBeInTheDocument();

      // Resolve the promise to cleanup
      resolvePromise!({ ok: true });
    });

    it("disables button while clearing", async () => {
      let resolvePromise: (value: { ok: boolean }) => void;
      const pendingPromise = new Promise<{ ok: boolean }>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValue(pendingPromise);

      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear and click confirm
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /clear data/i }));

      // The trigger button should be disabled
      const triggerButton = screen.getByText("Clearing...").closest("button");
      expect(triggerButton).toBeDisabled();

      // Resolve the promise to cleanup
      resolvePromise!({ ok: true });
    });
  });

  describe("Error handling", () => {
    it("shows alert on API failure", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const mockAlert = vi.fn();
      global.alert = mockAlert;

      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear and click confirm
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /clear data/i }));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Failed to clear data. Check console for details.");
      });
    });

    it("shows alert on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const mockAlert = vi.fn();
      global.alert = mockAlert;

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear and click confirm
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /clear data/i }));

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith("Failed to clear data. Check console for details.");
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("re-enables button after error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const mockAlert = vi.fn();
      global.alert = mockAlert;
      vi.spyOn(console, "error").mockImplementation(() => {});

      render(<ClearDataButton />);

      // Open modal
      fireEvent.click(screen.getByRole("button", { name: /clear corrupted data/i }));

      // Wait for modal to appear and click confirm
      await waitFor(() => {
        expect(screen.getByText("Clear All Game Data")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: /clear data/i }));

      await waitFor(() => {
        const triggerButton = screen.getByText("Clear corrupted data").closest("button");
        expect(triggerButton).not.toBeDisabled();
      });
    });
  });

  describe("Button type", () => {
    it("has type button to prevent form submission", () => {
      render(<ClearDataButton />);

      const button = screen.getByRole("button", { name: /clear corrupted data/i });
      expect(button).toHaveAttribute("type", "button");
    });
  });
});
