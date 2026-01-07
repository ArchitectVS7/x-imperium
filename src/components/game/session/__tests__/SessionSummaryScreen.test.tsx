/**
 * Tests for SessionSummaryScreen component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SessionSummaryScreen } from "../SessionSummaryScreen";
import * as sessionActions from "@/app/actions/session-actions";

// Mock the session actions
vi.mock("@/app/actions/session-actions", () => ({
  getSessionDataAction: vi.fn(),
}));

describe("SessionSummaryScreen", () => {
  const mockSessionData: sessionActions.SessionData = {
    summary: {
      sessionNumber: 1,
      turnsPlayed: 25,
      duration: 3600000, // 1 hour
      empiresEliminated: 2,
      notableEvents: [
        {
          turn: 10,
          type: "elimination",
          description: "Empire Alpha was eliminated by Empire Beta",
          empireIds: ["empire-1", "empire-2"],
        },
        {
          turn: 15,
          type: "alliance_formed",
          description: "Empire Beta and Empire Gamma formed an alliance",
          empireIds: ["empire-2", "empire-3"],
        },
        {
          turn: 20,
          type: "combat_victory",
          description: "Empire Beta defeated Empire Delta in battle",
          empireIds: ["empire-2", "empire-4"],
        },
      ],
      rawEvents: [],
      startTurn: 1,
      endTurn: 25,
    },
    empireRankings: [
      {
        id: "empire-player",
        name: "Player Empire",
        emperorName: "Emperor Test",
        networth: 150000,
        sectorCount: 12,
        isPlayer: true,
        isEliminated: false,
      },
      {
        id: "empire-2",
        name: "Bot Empire Beta",
        emperorName: "Bot Beta",
        networth: 120000,
        sectorCount: 10,
        isPlayer: false,
        isEliminated: false,
      },
      {
        id: "empire-3",
        name: "Bot Empire Gamma",
        emperorName: "Bot Gamma",
        networth: 100000,
        sectorCount: 8,
        isPlayer: false,
        isEliminated: false,
      },
    ],
    currentTurn: 25,
    gameId: "test-game-id",
  };

  const mockOnContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(sessionActions.getSessionDataAction).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    expect(screen.getByText("Loading session summary...")).toBeInTheDocument();
  });

  it("renders session summary data", async () => {
    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(mockSessionData);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("Session #1 Complete")).toBeInTheDocument();
    });

    // Check statistics by checking for specific stat cards
    expect(screen.getByText("Turns Played")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("1h 0m")).toBeInTheDocument(); // Duration
    expect(screen.getByText("Eliminations")).toBeInTheDocument();

    // Check turn range
    expect(screen.getByText("Turns 1 - 25")).toBeInTheDocument();
  });

  it("displays empire rankings correctly", async () => {
    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(mockSessionData);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("Power Rankings")).toBeInTheDocument();
    });

    // Check rankings
    expect(screen.getByText("Player Empire")).toBeInTheDocument();
    expect(screen.getByText("Bot Empire Beta")).toBeInTheDocument();
    expect(screen.getByText("Bot Empire Gamma")).toBeInTheDocument();

    // Check player marker
    expect(screen.getByText("YOU")).toBeInTheDocument();

    // Check networth display
    expect(screen.getByText("150,000")).toBeInTheDocument();
  });

  it("displays notable events with icons", async () => {
    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(mockSessionData);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("Notable Events")).toBeInTheDocument();
    });

    // Check event descriptions
    expect(screen.getByText("Empire Alpha was eliminated by Empire Beta")).toBeInTheDocument();
    expect(screen.getByText("Empire Beta and Empire Gamma formed an alliance")).toBeInTheDocument();
    expect(screen.getByText("Empire Beta defeated Empire Delta in battle")).toBeInTheDocument();

    // Check turn numbers
    expect(screen.getByText("Turn 10")).toBeInTheDocument();
    expect(screen.getByText("Turn 15")).toBeInTheDocument();
    expect(screen.getByText("Turn 20")).toBeInTheDocument();
  });

  it("calls onContinue when continue button is clicked", async () => {
    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(mockSessionData);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByTestId("continue-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("continue-button"));

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it("handles error state gracefully", async () => {
    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(null);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load session data")).toBeInTheDocument();
    });

    expect(screen.getByText("Continue Anyway")).toBeInTheDocument();
  });

  it("displays eliminated empires correctly", async () => {
    const dataWithEliminatedEmpire = {
      ...mockSessionData,
      empireRankings: [
        ...mockSessionData.empireRankings,
        {
          id: "empire-eliminated",
          name: "Eliminated Empire",
          emperorName: "Former Emperor",
          networth: 0,
          sectorCount: 0,
          isPlayer: false,
          isEliminated: true,
        },
      ],
    };

    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(dataWithEliminatedEmpire);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("Eliminated Empire")).toBeInTheDocument();
    });

    expect(screen.getByText("ELIMINATED")).toBeInTheDocument();
  });

  it("formats duration correctly for different time ranges", async () => {
    // Test with minutes only
    const dataWithShortDuration = {
      ...mockSessionData,
      summary: {
        ...mockSessionData.summary,
        duration: 300000, // 5 minutes
      },
    };

    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(dataWithShortDuration);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("5m 0s")).toBeInTheDocument();
    });
  });

  it("formats long duration correctly", async () => {
    // Test with hours and minutes
    const dataWithLongDuration = {
      ...mockSessionData,
      summary: {
        ...mockSessionData.summary,
        duration: 7320000, // 2h 2m
      },
    };

    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(dataWithLongDuration);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("2h 2m")).toBeInTheDocument();
    });
  });

  it("handles empty notable events list", async () => {
    const dataWithNoEvents = {
      ...mockSessionData,
      summary: {
        ...mockSessionData.summary,
        notableEvents: [],
      },
    };

    vi.mocked(sessionActions.getSessionDataAction).mockResolvedValue(dataWithNoEvents);

    render(<SessionSummaryScreen onContinue={mockOnContinue} />);

    await waitFor(() => {
      expect(screen.getByText("No notable events this session")).toBeInTheDocument();
    });
  });
});
