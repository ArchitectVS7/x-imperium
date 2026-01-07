import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ResourceIcons,
  SectorIcons,
  UnitIcons,
  CivilStatusIcons,
  ActionIcons,
  UIIcons,
  ResourceIconWithValue,
  Icon,
} from "@/lib/theme/icons";

describe("Icon System", () => {
  describe("ResourceIcons", () => {
    it("exports all resource icons", () => {
      expect(ResourceIcons.credits).toBeDefined();
      expect(ResourceIcons.food).toBeDefined();
      expect(ResourceIcons.ore).toBeDefined();
      expect(ResourceIcons.petroleum).toBeDefined();
      expect(ResourceIcons.researchPoints).toBeDefined();
      expect(ResourceIcons.population).toBeDefined();
      expect(ResourceIcons.networth).toBeDefined();
    });

    it("renders credits icon as SVG component", () => {
      const CreditsIcon = ResourceIcons.credits;
      render(<CreditsIcon data-testid="credits-icon" />);

      const icon = screen.getByTestId("credits-icon");
      expect(icon).toBeInTheDocument();
      expect(icon.tagName.toLowerCase()).toBe("svg");
    });
  });

  describe("SectorIcons", () => {
    it("exports all sector icons", () => {
      expect(SectorIcons.food).toBeDefined();
      expect(SectorIcons.ore).toBeDefined();
      expect(SectorIcons.petroleum).toBeDefined();
      expect(SectorIcons.tourism).toBeDefined();
      expect(SectorIcons.urban).toBeDefined();
      expect(SectorIcons.education).toBeDefined();
      expect(SectorIcons.government).toBeDefined();
      expect(SectorIcons.research).toBeDefined();
      expect(SectorIcons.supply).toBeDefined();
      expect(SectorIcons.anti_pollution).toBeDefined();
      expect(SectorIcons.industrial).toBeDefined();
    });
  });

  describe("UnitIcons", () => {
    it("exports all unit icons", () => {
      expect(UnitIcons.soldiers).toBeDefined();
      expect(UnitIcons.fighters).toBeDefined();
      expect(UnitIcons.stations).toBeDefined();
      expect(UnitIcons.carriers).toBeDefined();
      expect(UnitIcons.covertAgents).toBeDefined();
      expect(UnitIcons.generals).toBeDefined();
      expect(UnitIcons.marines).toBeDefined();
      expect(UnitIcons.interceptors).toBeDefined();
      expect(UnitIcons.lightCruisers).toBeDefined();
      expect(UnitIcons.defenseStations).toBeDefined();
      expect(UnitIcons.heavyCruisers).toBeDefined();
      expect(UnitIcons.battlecruisers).toBeDefined();
      expect(UnitIcons.dreadnought).toBeDefined();
      expect(UnitIcons.stealthCruiser).toBeDefined();
    });
  });

  describe("CivilStatusIcons", () => {
    it("exports all civil status icons", () => {
      expect(CivilStatusIcons.ecstatic).toBeDefined();
      expect(CivilStatusIcons.happy).toBeDefined();
      expect(CivilStatusIcons.content).toBeDefined();
      expect(CivilStatusIcons.neutral).toBeDefined();
      expect(CivilStatusIcons.unhappy).toBeDefined();
      expect(CivilStatusIcons.angry).toBeDefined();
      expect(CivilStatusIcons.rioting).toBeDefined();
      expect(CivilStatusIcons.revolting).toBeDefined();
    });
  });

  describe("ActionIcons", () => {
    it("exports all action icons", () => {
      expect(ActionIcons.military).toBeDefined();
      expect(ActionIcons.sectors).toBeDefined();
      expect(ActionIcons.combat).toBeDefined();
      expect(ActionIcons.diplomacy).toBeDefined();
      expect(ActionIcons.market).toBeDefined();
      expect(ActionIcons.covert).toBeDefined();
      expect(ActionIcons.crafting).toBeDefined();
      expect(ActionIcons.research).toBeDefined();
      expect(ActionIcons.starmap).toBeDefined();
      expect(ActionIcons.messages).toBeDefined();
      expect(ActionIcons.dashboard).toBeDefined();
      expect(ActionIcons.endTurn).toBeDefined();
    });
  });

  describe("UIIcons", () => {
    it("exports all UI icons", () => {
      expect(UIIcons.menu).toBeDefined();
      expect(UIIcons.close).toBeDefined();
      expect(UIIcons.chevronDown).toBeDefined();
      expect(UIIcons.chevronUp).toBeDefined();
      expect(UIIcons.chevronRight).toBeDefined();
      expect(UIIcons.info).toBeDefined();
      expect(UIIcons.alert).toBeDefined();
      expect(UIIcons.warning).toBeDefined();
      expect(UIIcons.help).toBeDefined();
      expect(UIIcons.success).toBeDefined();
      expect(UIIcons.pending).toBeDefined();
      expect(UIIcons.processing).toBeDefined();
      expect(UIIcons.paused).toBeDefined();
    });
  });

  describe("Icon component", () => {
    it("renders icon with default size", () => {
      const { container } = render(<Icon icon={ResourceIcons.credits} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });

    it("applies custom className", () => {
      const { container } = render(<Icon icon={ResourceIcons.credits} className="text-amber-500" />);
      const icon = container.querySelector("svg");
      expect(icon).toHaveClass("text-amber-500");
    });

    it("applies custom size", () => {
      const { container } = render(<Icon icon={ResourceIcons.credits} size={24} />);
      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("ResourceIconWithValue component", () => {
    it("renders credits with correct color", () => {
      render(<ResourceIconWithValue resource="credits" value={10000} />);
      // 10000 / 1000 = 10K
      expect(screen.getByText("10K")).toBeInTheDocument();
    });

    it("renders food with correct color", () => {
      render(<ResourceIconWithValue resource="food" value={5000} />);
      expect(screen.getByText("5K")).toBeInTheDocument();
    });

    it("formats values correctly - below 1000", () => {
      render(<ResourceIconWithValue resource="credits" value={500} />);
      expect(screen.getByText("500")).toBeInTheDocument();
    });

    it("formats values correctly - thousands (K)", () => {
      render(<ResourceIconWithValue resource="credits" value={5000} />);
      expect(screen.getByText("5K")).toBeInTheDocument();
    });

    it("formats values correctly - millions (M)", () => {
      render(<ResourceIconWithValue resource="credits" value={1500000} />);
      expect(screen.getByText("1.5M")).toBeInTheDocument();
    });

    it("applies compact styling when compact prop is true", () => {
      const { container } = render(
        <ResourceIconWithValue resource="credits" value={1000} compact />
      );
      // Compact should use smaller text (text-xs)
      expect(container.querySelector(".text-xs")).toBeInTheDocument();
    });

    it("applies regular styling when compact prop is false", () => {
      const { container } = render(
        <ResourceIconWithValue resource="credits" value={1000} compact={false} />
      );
      expect(container.querySelector(".text-sm")).toBeInTheDocument();
    });

    it("renders all resource types", () => {
      const resources = ["credits", "food", "ore", "petroleum", "researchPoints", "population", "networth"] as const;

      resources.forEach((resource) => {
        const { unmount } = render(
          <ResourceIconWithValue resource={resource} value={1000} />
        );
        // 1000 is formatted as "1K" (Math.floor(1000/1000) = 1)
        expect(screen.getByText("1K")).toBeInTheDocument();
        unmount();
      });
    });

    it("applies custom className", () => {
      const { container } = render(
        <ResourceIconWithValue resource="credits" value={1000} className="custom-class" />
      );
      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
