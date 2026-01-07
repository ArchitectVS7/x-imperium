import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmpireStatusBar } from "../EmpireStatusBar";

describe("EmpireStatusBar", () => {
  const defaultProps = {
    credits: 100000,
    food: 5000,
    ore: 2000,
    petroleum: 1500,
    researchPoints: 3000,
    population: 12500,
    sectorCount: 15,
    militaryPower: 50000,
    networth: 250000,
    rank: 3,
    civilStatus: "content" as const,
  };

  it("renders with data-testid", () => {
    render(<EmpireStatusBar {...defaultProps} />);
    expect(screen.getByTestId("empire-status-bar")).toBeInTheDocument();
  });

  describe("Resource display", () => {
    it("displays all resources", () => {
      render(<EmpireStatusBar {...defaultProps} />);

      // Credits, food, ore, petroleum, research all shown in compact format
      // ResourceIconWithValue uses Math.floor for K values
      expect(screen.getByText("100K")).toBeInTheDocument(); // 100000
      expect(screen.getByText("5K")).toBeInTheDocument();   // 5000
      expect(screen.getByText("2K")).toBeInTheDocument();   // 2000
      expect(screen.getByText("1K")).toBeInTheDocument();   // 1500 -> Math.floor = 1K
      expect(screen.getByText("3K")).toBeInTheDocument();   // 3000
    });
  });

  describe("Sector display", () => {
    it("displays sector count", () => {
      render(<EmpireStatusBar {...defaultProps} />);
      expect(screen.getByText("15")).toBeInTheDocument();
    });

    it("shows singular Sector for count of 1", () => {
      render(<EmpireStatusBar {...defaultProps} sectorCount={1} />);
      expect(screen.getByText("1")).toBeInTheDocument();
      expect(screen.getByText(/Sector/)).toBeInTheDocument();
    });

    it("shows plural Sectors for count > 1", () => {
      render(<EmpireStatusBar {...defaultProps} sectorCount={5} />);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText(/Sectors/)).toBeInTheDocument();
    });
  });

  describe("Military power display", () => {
    it("displays military power", () => {
      render(<EmpireStatusBar {...defaultProps} />);
      // 50000 uses formatCompact in EmpireStatusBar which shows "50K"
      expect(screen.getByText("50K")).toBeInTheDocument();
    });

    it("shows Power label", () => {
      render(<EmpireStatusBar {...defaultProps} />);
      expect(screen.getByText(/Power/)).toBeInTheDocument();
    });
  });

  describe("Population display", () => {
    it("displays population", () => {
      render(<EmpireStatusBar {...defaultProps} />);
      // 12500 uses ResourceIconWithValue which shows "12K" (Math.floor)
      expect(screen.getByText("12K")).toBeInTheDocument();
    });
  });

  describe("Civil status display", () => {
    it("displays civil status", () => {
      render(<EmpireStatusBar {...defaultProps} civilStatus="content" />);
      expect(screen.getByText("Steady")).toBeInTheDocument(); // "content" maps to "Steady" in names.ts
    });

    it("displays different civil statuses", () => {
      const statuses = [
        { key: "ecstatic", name: "Thriving" },
        { key: "happy", name: "Peaceful" },
        { key: "content", name: "Steady" },
        { key: "unhappy", name: "Strained" },
      ] as const;

      statuses.forEach(({ key, name }) => {
        const { unmount } = render(
          <EmpireStatusBar {...defaultProps} civilStatus={key} />
        );
        expect(screen.getByText(name)).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe("Rank display", () => {
    it("displays rank when provided", () => {
      render(<EmpireStatusBar {...defaultProps} rank={3} />);
      expect(screen.getByText("#3")).toBeInTheDocument();
    });

    it("does not display rank when undefined", () => {
      render(<EmpireStatusBar {...defaultProps} rank={undefined} />);
      expect(screen.queryByText(/Rank/)).not.toBeInTheDocument();
    });
  });

  describe("Networth display", () => {
    it("displays networth", () => {
      render(<EmpireStatusBar {...defaultProps} />);
      // 250000 uses formatCompact which shows "250K"
      expect(screen.getByText("250K")).toBeInTheDocument();
    });

    it("shows Renown label", () => {
      render(<EmpireStatusBar {...defaultProps} />);
      expect(screen.getByText(/Renown/)).toBeInTheDocument();
    });
  });

  describe("Panel toggle functionality", () => {
    it("calls onPanelToggle with 'resources' when resource button clicked", () => {
      const mockToggle = vi.fn();
      render(
        <EmpireStatusBar
          {...defaultProps}
          onPanelToggle={mockToggle}
        />
      );

      // Find the resources button (contains all resource icons)
      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]!); // First button is resources

      expect(mockToggle).toHaveBeenCalledWith("resources");
    });

    it("calls onPanelToggle with 'sectors' when sectors button clicked", () => {
      const mockToggle = vi.fn();
      render(
        <EmpireStatusBar
          {...defaultProps}
          onPanelToggle={mockToggle}
        />
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[1]!); // Second button is sectors/sectors

      expect(mockToggle).toHaveBeenCalledWith("sectors");
    });

    it("calls onPanelToggle with 'military' when military button clicked", () => {
      const mockToggle = vi.fn();
      render(
        <EmpireStatusBar
          {...defaultProps}
          onPanelToggle={mockToggle}
        />
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[2]!); // Third button is military

      expect(mockToggle).toHaveBeenCalledWith("military");
    });

    it("calls onPanelToggle with 'population' when population button clicked", () => {
      const mockToggle = vi.fn();
      render(
        <EmpireStatusBar
          {...defaultProps}
          onPanelToggle={mockToggle}
        />
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[3]!); // Fourth button is population

      expect(mockToggle).toHaveBeenCalledWith("population");
    });

    it("toggles panel off when same panel is active", () => {
      const mockToggle = vi.fn();
      render(
        <EmpireStatusBar
          {...defaultProps}
          activePanel="resources"
          onPanelToggle={mockToggle}
        />
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[0]!);

      expect(mockToggle).toHaveBeenCalledWith(null);
    });
  });

  describe("Active panel styling", () => {
    it("highlights active resources panel", () => {
      const { container } = render(
        <EmpireStatusBar {...defaultProps} activePanel="resources" />
      );

      // Active panel should have border styling
      const activeButton = container.querySelector(".border-lcars-amber\\/50");
      expect(activeButton).toBeInTheDocument();
    });

    it("highlights active sectors panel", () => {
      const { container } = render(
        <EmpireStatusBar {...defaultProps} activePanel="sectors" />
      );

      const activeButton = container.querySelector(".border-lcars-amber\\/50");
      expect(activeButton).toBeInTheDocument();
    });
  });

  describe("Responsive behavior", () => {
    it("has hidden class for mobile", () => {
      render(<EmpireStatusBar {...defaultProps} />);

      const bar = screen.getByTestId("empire-status-bar");
      expect(bar).toHaveClass("hidden", "lg:block");
    });
  });

  describe("Edge cases", () => {
    it("handles zero values", () => {
      render(
        <EmpireStatusBar
          {...defaultProps}
          credits={0}
          food={0}
          ore={0}
          petroleum={0}
          researchPoints={0}
          population={0}
          sectorCount={0}
          militaryPower={0}
          networth={0}
        />
      );

      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });

    it("handles very large values", () => {
      render(
        <EmpireStatusBar
          {...defaultProps}
          credits={1500000}
          networth={2000000}
        />
      );

      // ResourceIconWithValue formats: 1500000 / 1000000 = 1.5M
      expect(screen.getByText("1.5M")).toBeInTheDocument();
      // formatCompact in EmpireStatusBar: 2000000 / 1000000 = 2.0M
      expect(screen.getByText("2.0M")).toBeInTheDocument();
    });

    it("handles no onPanelToggle callback", () => {
      render(<EmpireStatusBar {...defaultProps} />);

      const buttons = screen.getAllByRole("button");
      // Should not throw when clicked without callback
      expect(() => fireEvent.click(buttons[0]!)).not.toThrow();
    });
  });
});
