import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ActiveApplicationIndicator from "./ActiveApplicationsIndicator";
import { Retreat, Yogi, SelectionState, AttendanceState } from "../../types/domain";

// Mock Tooltip from @dhis2/ui
jest.mock("@dhis2/ui", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
}));

const mockMetadataStore: any = {
  retreats: [],
  currentRetreats: [],
  retreatsMapWithCodeKey: {},
};

jest.mock("../../stores/StoreProvider", () => ({
  useStore: () => ({
    metadata: mockMetadataStore,
  }),
}));

describe("ActiveApplicationsIndicator", () => {
  const currentRetreat: Retreat = {
    id: "R_CURR_ID",
    code: "R_CURR",
    name: "Current Retreat Oct 2026",
    retreatCode: "10SS4",
    current: true,
    season: "season_2026",
    date: new Date("2026-10-20"),
    endDate: new Date("2026-10-31"),
    disabled: false,
    location: "Loc1",
    totalYogis: "50",
    retreatType: "silent",
    noOfDays: "10",
    medium: "sinhala",
    finalized: false,
  };

  const pastRetreat: Retreat = {
    id: "R_PAST_ID",
    code: "R_PAST",
    name: "Past Retreat Feb 2026",
    retreatCode: "5SS21",
    current: false,
    date: new Date("2026-02-28"),
    endDate: new Date("2026-03-05"),
    disabled: false,
    location: "Loc1",
    totalYogis: "30",
    retreatType: "silent",
    noOfDays: "5",
    medium: "sinhala",
    finalized: true,
  };

  beforeEach(() => {
    mockMetadataStore.retreats = [currentRetreat, pastRetreat];
    mockMetadataStore.currentRetreats = [currentRetreat];
    mockMetadataStore.retreatsMapWithCodeKey = {
      [currentRetreat.code]: currentRetreat,
      [pastRetreat.code]: pastRetreat,
    };
  });

  test("renders past unfulfilled application under Old Applications", () => {
    const yogi: Yogi = {
      id: "TEI_1",
      active: true,
      attributes: {},
      expressionOfInterests: {
        [currentRetreat.code]: {
          state: SelectionState.APPLIED,
          occurredAt: "2026-08-01",
        },
        [pastRetreat.code]: {
          state: SelectionState.PENDING,
          occurredAt: "2025-12-19",
        },
      },
      participation: {},
      specialComments: [],
      notes: [],
    };

    const markup = renderToStaticMarkup(
      <ActiveApplicationIndicator
        currentRetreat={currentRetreat}
        trackedEntity={yogi}
      />
    );

    expect(markup).toContain("Old Applications");
    expect(markup).toContain("5SS21");
    expect(markup).toContain("pending");
  });

  test("does not render past application under Old Applications if yogi attended it", () => {
    const yogi: Yogi = {
      id: "TEI_2",
      active: true,
      attributes: {},
      expressionOfInterests: {
        [currentRetreat.code]: {
          state: SelectionState.APPLIED,
          occurredAt: "2026-08-01",
        },
        [pastRetreat.code]: {
          state: SelectionState.SELECTED,
          occurredAt: "2025-12-19",
        },
      },
      participation: {
        [pastRetreat.code]: {
          retreat: pastRetreat.code,
          attendance: AttendanceState.ATTENDED,
        },
      },
      specialComments: [],
      notes: [],
    };

    const markup = renderToStaticMarkup(
      <ActiveApplicationIndicator
        currentRetreat={currentRetreat}
        trackedEntity={yogi}
      />
    );

    expect(markup).not.toContain("Old Applications");
  });

  test("labels unconfirmed as failed to confirm and unattending as not attending in pills", () => {
    const pastRetreat2: Retreat = {
      ...pastRetreat,
      id: "R_PAST_2",
      code: "R_PAST_2",
      retreatCode: "5SS20",
    };
    mockMetadataStore.retreatsMapWithCodeKey[pastRetreat2.code] = pastRetreat2;

    const yogi: Yogi = {
      id: "TEI_3",
      active: true,
      attributes: {},
      expressionOfInterests: {
        [currentRetreat.code]: {
          state: SelectionState.APPLIED,
          occurredAt: "2026-08-01",
        },
        [pastRetreat.code]: {
          state: SelectionState.UNATTENDING,
          occurredAt: "2025-12-19",
        },
        [pastRetreat2.code]: {
          state: SelectionState.UNCONFIRMED,
          occurredAt: "2025-11-19",
        },
      },
      participation: {},
      specialComments: [],
      notes: [],
    };

    const markup = renderToStaticMarkup(
      <ActiveApplicationIndicator
        currentRetreat={currentRetreat}
        trackedEntity={yogi}
      />
    );

    expect(markup).toContain("failed to confirm");
    expect(markup).not.toContain(">unconfirmed<");
    expect(markup).toContain("not attending");
    expect(markup).not.toContain(">unattending<");
  });
});
