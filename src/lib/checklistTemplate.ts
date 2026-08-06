import type { ChecklistSectionTemplate } from '../types';

/**
 * ─── Move Checklist Template ──────────────────────────────────────────────────
 *
 * This file is the *only* place checklist content lives. Sections and items are
 * transcribed here; the app derives everything else (due dates, ordering,
 * progress) from the move plan.
 *
 * Each item's due date is expressed as an offset from a named date the move plan
 * builder produces:
 *
 *   anchor      — which move-plan date to measure from (see ChecklistAnchor)
 *   offsetDays  — negative = before the anchor, positive = after
 *   offsetMode  — 'workday' (default, skips weekends) or 'calendar'
 *   requires    — gate the item to jobs that include that work
 *                 e.g. { cleanout: true }, { auction: true },
 *                      { moveTypes: ['Full Move', 'Downsize Only'] }
 *
 * To change what appears on the checklist, edit this array only. Nothing else in
 * the app hard-codes item text, section names, or dates.
 */
export const CHECKLIST_TEMPLATE: ChecklistSectionTemplate[] = [
  // ── Intake ──────────────────────────────────────────────────────────────────
  {
    id: 'intake',
    title: 'Intake & Agreement',
    description: 'Everything that has to be true before the first visit happens.',
    items: [
      {
        id: 'intake-agreement-signed',
        label: 'Signed service agreement on file',
        anchor: 'firstVisit',
        offsetDays: -2,
        owner: 'PM',
      },
      {
        id: 'intake-deposit',
        label: 'Deposit collected',
        anchor: 'firstVisit',
        offsetDays: -2,
        owner: 'PM',
      },
      {
        id: 'intake-contacts',
        label: 'Client and family contact sheet completed',
        detail: 'Primary contact, decision maker, and after-hours number.',
        anchor: 'firstVisit',
        offsetDays: -1,
        owner: 'PM',
      },
      {
        id: 'intake-community-confirm',
        label: 'Confirm destination community, unit number, and move-in date',
        anchor: 'firstVisit',
        offsetDays: -1,
        owner: 'PM',
      },
      {
        id: 'intake-floorplan',
        label: 'Obtain destination floor plan with dimensions',
        anchor: 'firstVisit',
        offsetDays: -1,
        owner: 'PM',
      },
      {
        id: 'intake-coi',
        label: 'Certificate of insurance sent to both buildings',
        anchor: 'moveDay',
        offsetDays: -10,
        owner: 'PM',
      },
    ],
  },

  // ── Phase 1 ─────────────────────────────────────────────────────────────────
  {
    id: 'first-visit',
    title: 'First Visit: Planning',
    description: 'Walkthrough, measurements, and the floor plan decision.',
    items: [
      {
        id: 'fv-walkthrough',
        label: 'Full walkthrough of origin home, room by room',
        anchor: 'firstVisit',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'fv-measure',
        label: 'Measure large furniture the client wants to keep',
        anchor: 'firstVisit',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'fv-photos',
        label: 'Photograph each room and any high-value or fragile items',
        anchor: 'firstVisit',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'fv-floorplan-draft',
        label: 'Draft destination floor plan placement',
        anchor: 'firstVisit',
        offsetDays: 2,
        owner: 'PM',
      },
      {
        id: 'fv-floorplan-approve',
        label: 'Review floor plan with client and get approval',
        anchor: 'secondVisit',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'fv-access-notes',
        label: 'Note access constraints: elevators, stairs, parking, loading dock',
        anchor: 'firstVisit',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'fv-supply-estimate',
        label: 'Estimate packing supplies and order shortfall',
        anchor: 'firstVisit',
        offsetDays: 2,
        owner: 'PM',
      },
    ],
  },

  // ── Phase 2 ─────────────────────────────────────────────────────────────────
  {
    id: 'second-visit',
    title: 'Second Visit: Initial Sort & Pack',
    description: 'First working session with the client — set the sort categories.',
    items: [
      {
        id: 'sv-categories',
        label: 'Establish keep / gift / sell / donate / dispose categories with client',
        anchor: 'secondVisit',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'sv-label-system',
        label: 'Set up room labeling and color-coding system',
        anchor: 'secondVisit',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'sv-start-lowstakes',
        label: 'Begin packing low-decision areas (linens, storage, guest rooms)',
        anchor: 'secondVisit',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'sv-family-items',
        label: 'Identify items family members are taking and confirm pickup dates',
        anchor: 'secondVisit',
        offsetDays: 1,
        owner: 'PM',
      },
      {
        id: 'sv-supplies-onsite',
        label: 'Confirm packing supplies staged on site',
        anchor: 'sortDayFirst',
        offsetDays: -1,
        owner: 'Lead',
      },
    ],
  },

  // ── Phase 3 ─────────────────────────────────────────────────────────────────
  {
    id: 'sort-pack',
    title: 'Sort & Pack',
    description: 'The main working days between the second visit and final pack.',
    items: [
      {
        id: 'sp-room-by-room',
        label: 'Work room by room against the approved floor plan',
        anchor: 'sortDayFirst',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'sp-inventory',
        label: 'Maintain box inventory with room destination on every carton',
        anchor: 'sortDayFirst',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'sp-valuables',
        label: 'Separate jewelry, documents, and medications for client to transport',
        anchor: 'sortDayLast',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'sp-donation-pickup',
        label: 'Schedule donation pickup',
        anchor: 'sortDayLast',
        offsetDays: 1,
        owner: 'PM',
      },
      {
        id: 'sp-consignment',
        label: 'Route consignment and resale items to buyers',
        anchor: 'sortDayLast',
        offsetDays: 1,
        owner: 'PM',
        requires: { moveTypes: ['Full Move', 'Downsize Only'] },
      },
      {
        id: 'sp-progress-check',
        label: 'Mid-sort progress check against budgeted hours',
        anchor: 'sortDayLast',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'sp-client-checkin',
        label: 'Client check-in call on progress and remaining decisions',
        anchor: 'finalPackDay',
        offsetDays: -3,
        owner: 'PM',
      },
    ],
  },

  // ── Phase 4 ─────────────────────────────────────────────────────────────────
  {
    id: 'final-pack',
    title: 'Final Pack & Pre-Move',
    description: 'The day before the move — everything staged and confirmed.',
    items: [
      {
        id: 'fp-confirm-crew',
        label: 'Confirm move day crew, arrival time, and vehicle',
        anchor: 'finalPackDay',
        offsetDays: -2,
        owner: 'PM',
      },
      {
        id: 'fp-confirm-elevator',
        label: 'Reserve elevator and loading dock at both buildings',
        anchor: 'moveDay',
        offsetDays: -5,
        owner: 'PM',
      },
      {
        id: 'fp-utilities',
        label: 'Confirm utility transfer and mail forwarding dates',
        anchor: 'moveDay',
        offsetDays: -7,
        owner: 'PM',
      },
      {
        id: 'fp-pack-remaining',
        label: 'Pack remaining daily-use items',
        anchor: 'finalPackDay',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'fp-firstnight',
        label: 'Assemble and clearly mark the first-night essentials box',
        detail: 'Medications, toiletries, change of clothes, phone charger, bedding.',
        anchor: 'finalPackDay',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'fp-disassembly',
        label: 'Disassemble furniture and bag hardware to the piece',
        anchor: 'finalPackDay',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'fp-protect',
        label: 'Protect floors, door frames, and elevator walls',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'fp-final-walk',
        label: 'Final walkthrough with client to confirm nothing is missed',
        anchor: 'finalPackDay',
        offsetDays: 0,
        owner: 'PM',
      },
    ],
  },

  // ── Phase 5 ─────────────────────────────────────────────────────────────────
  {
    id: 'move-day',
    title: 'Move Day',
    description: 'Load, transport, place, and unpack.',
    items: [
      {
        id: 'md-crew-brief',
        label: 'Crew briefing: floor plan, fragile items, client preferences',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'md-load',
        label: 'Load truck by destination room',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'md-origin-sweep',
        label: 'Sweep origin: closets, cabinets, attic, garage, behind doors',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Assist PM',
      },
      {
        id: 'md-place-furniture',
        label: 'Place and reassemble furniture per approved floor plan',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'md-make-bed',
        label: 'Make the bed before the client arrives',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'md-unpack-essentials',
        label: 'Unpack kitchen, bathroom, and bedroom essentials',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'md-electronics',
        label: 'Connect TV, phone, and medical alert devices',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'md-hang-art',
        label: 'Hang artwork and mirrors',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'md-remove-debris',
        label: 'Remove cartons, packing paper, and debris',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'md-client-walkthrough',
        label: 'Walk the new home with the client and confirm satisfaction',
        anchor: 'moveDay',
        offsetDays: 0,
        owner: 'PM',
      },
    ],
  },

  // ── Cleanout ────────────────────────────────────────────────────────────────
  {
    id: 'cleanout',
    title: 'Cleanout',
    description: 'Clearing the origin home after the move.',
    requires: { cleanout: true },
    items: [
      {
        id: 'co-confirm-scope',
        label: 'Confirm cleanout scope and disposal method with client',
        anchor: 'cleanoutDay',
        offsetDays: -3,
        owner: 'PM',
      },
      {
        id: 'co-dumpster',
        label: 'Schedule dumpster or haul-away service',
        anchor: 'cleanoutDay',
        offsetDays: -2,
        owner: 'PM',
      },
      {
        id: 'co-final-sweep',
        label: 'Final sweep of every room, closet, and outbuilding',
        anchor: 'cleanoutDay',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'co-donation-run',
        label: 'Complete donation run and retain receipts for the client',
        anchor: 'cleanoutDay',
        offsetDays: 1,
        owner: 'Specialist',
      },
      {
        id: 'co-broom-clean',
        label: 'Leave home broom-clean and photograph final condition',
        anchor: 'cleanoutDay',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'co-keys',
        label: 'Return keys, garage remotes, and access fobs',
        anchor: 'cleanoutDay',
        offsetDays: 1,
        owner: 'PM',
      },
    ],
  },

  // ── Auction ─────────────────────────────────────────────────────────────────
  {
    id: 'auction',
    title: 'Auction & Pickup',
    description: 'Estate sale track for items not moving with the client.',
    requires: { auction: true },
    items: [
      {
        id: 'au-lot-org',
        label: 'Organize and stage lots',
        anchor: 'auctionLotOrg',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'au-photograph',
        label: 'Photograph and catalog every lot',
        anchor: 'auctionLotOrg',
        offsetDays: 0,
        owner: 'Specialist',
      },
      {
        id: 'au-listings',
        label: 'Write listings and publish the auction',
        anchor: 'auctionStart',
        offsetDays: -1,
        owner: 'PM',
      },
      {
        id: 'au-open',
        label: 'Auction opens',
        anchor: 'auctionStart',
        offsetDays: 0,
        owner: 'PM',
      },
      {
        id: 'au-buyer-comms',
        label: 'Send buyer pickup instructions',
        anchor: 'auctionPickup',
        offsetDays: -2,
        owner: 'PM',
      },
      {
        id: 'au-pickup',
        label: 'Staff buyer pickup day',
        anchor: 'auctionPickup',
        offsetDays: 0,
        owner: 'Lead',
      },
      {
        id: 'au-settlement',
        label: 'Reconcile proceeds and send settlement statement to client',
        anchor: 'auctionPickup',
        offsetDays: 5,
        owner: 'PM',
      },
    ],
  },

  // ── Wrap-up ─────────────────────────────────────────────────────────────────
  {
    id: 'follow-up',
    title: 'Post-Move Follow-Up',
    description: 'Closing the job out.',
    items: [
      {
        id: 'fu-day-after',
        label: 'Day-after check-in call with client and family',
        anchor: 'moveDay',
        offsetDays: 1,
        owner: 'PM',
      },
      {
        id: 'fu-punch-list',
        label: 'Resolve punch list items from the client walkthrough',
        anchor: 'moveDay',
        offsetDays: 3,
        owner: 'PM',
      },
      {
        id: 'fu-damage',
        label: 'Document and file any damage claims',
        anchor: 'moveDay',
        offsetDays: 3,
        owner: 'PM',
      },
      {
        id: 'fu-hours-recon',
        label: 'Reconcile actual hours against budgeted hours',
        anchor: 'moveDay',
        offsetDays: 5,
        owner: 'PM',
      },
      {
        id: 'fu-invoice',
        label: 'Send final invoice',
        anchor: 'moveDay',
        offsetDays: 5,
        owner: 'PM',
      },
      {
        id: 'fu-review',
        label: 'Request review and referral',
        anchor: 'moveDay',
        offsetDays: 10,
        owner: 'PM',
      },
      {
        id: 'fu-debrief',
        label: 'Internal debrief: what to change on the next job',
        anchor: 'moveDay',
        offsetDays: 7,
        owner: 'PM',
      },
    ],
  },
];
