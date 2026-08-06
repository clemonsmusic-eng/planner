import type { ChecklistSectionTemplate, ChecklistItemTemplate } from '../types';

/**
 * Project Manager checklist content, transcribed from the Smooth Transitions
 * "PM Checklist" reference document. Section order and item wording follow the
 * document; each section is anchored to a milestone the Move Plan Builder
 * produces so due dates fall out of the generated plan.
 */

// Raw item shape — ids are derived from the text so state survives reordering.
type RawItem = Omit<ChecklistItemTemplate, 'id'>;
type RawSection = Omit<ChecklistSectionTemplate, 'items'> & { items: RawItem[] };

/** djb2 — stable, deterministic id from the section + item text. */
function hashId(sectionId: string, text: string): string {
  let h = 5381;
  const input = `${sectionId}|${text}`;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  }
  return `${sectionId}-${h.toString(36)}`;
}

/** Shown as a standing reminder above every checklist. */
export const CHECKLIST_STANDING_NOTE =
  'Throughout the process add notes to STWare and save emails from clients in STWare for reference by all team members.';

const RAW_SECTIONS: RawSection[] = [
  // ── Initial Handoff ─────────────────────────────────────────────────────────
  {
    id: 'handoff',
    name: 'Initial Handoff',
    owner: 'Director of Business Operations & Director of Operations',
    anchor: 'firstVisit',
    offsetWorkdays: -5,
    items: [
      { text: 'Director of Business Development hand off to Director of Operations' },
      { text: 'Director of Operations calls client and creates move plan and assigns a Project Manager' },
      { text: 'Director of Operations emails client and Project Manager the move plan and introduction to the Project Manager' },
    ],
  },

  // ── After PM Assignment ─────────────────────────────────────────────────────
  {
    id: 'pm-assignment',
    name: 'After Project Manager Assignment',
    owner: 'Project Manager',
    note: 'Complete within 2 business days of the handoff.',
    anchor: 'firstVisit',
    offsetWorkdays: -3,
    items: [
      { text: '"Reply All" to introductory email from Director of Operations to introduce yourself' },
      { text: 'Read notes in STWare and review invoice for services' },
      { text: 'Contact community to schedule site visit' },
      { text: 'Book movers — 1200 sq ft+ have a 2nd move truck on standby' },
      { text: 'Create paper folder to store all receipts that you will save for the client' },
      {
        text: 'Prior to each visit, send an email, call or text the client as a reminder of your upcoming visit the day before',
      },
    ],
  },

  // ── First Visit ─────────────────────────────────────────────────────────────
  {
    id: 'first-visit',
    name: 'First Visit and Floor Plan Reveal',
    owner: 'Project Manager',
    anchor: 'firstVisit',
    items: [
      {
        text: 'Place your business card in the ST folder (this should have been left with the client by the Director of Business Operations)',
      },
      {
        text: 'Confirm schedule of appointments, new address, and point of contact at community. Leave them a written copy of appointments and briefly explain the plan for each visit',
      },
      { text: "Ask for a copy of the community floor plan if you don't already have one" },
      {
        text: 'Explain our colored masking tape system',
        subItems: [
          'RED — stays in home for dispersal',
          'GREEN — goes to new home',
          'BLUE — goes to family',
          'ORANGE — donation',
          'YELLOW / other colors — various other designations (2nd stop, storage, etc.)',
          'NOTE: Do not put tape directly on gold leaf, paintings, delicate finishes, etc.',
        ],
      },
      { text: 'Take pictures and measurements of furniture "wishlist" (width across front edge and the depth)' },
      { text: 'Take pictures of the entire room in its natural state' },
      {
        text: 'Use a legal pad or furniture inventory sheet to track number, description, measurements, and note which room the piece should go to',
      },
      { text: 'Use alphanumeric numbering system for furniture — A1, A2, B1, B2, etc.' },
      { text: 'Check that Sleep Number beds, mechanical platform beds, and lift recliners are working properly' },
      { text: 'At the site visit say "hello" and check in at the front desk' },
      {
        text: "Ask to speak with the client's move-in coordinator to request access to the apartment, or the client's salesperson if there is no move-in coordinator",
      },
      { text: 'Get email / contact information' },
      { text: 'Confirm move date' },
      {
        text: 'Ask about move day procedures, moving truck parking, service elevator use / padding of elevator, and whether you can use onsite trash and recycling receptacles',
      },
      { text: 'Ask about TV mounting' },
      { text: 'Ask if cable boxes are provided and if so, how many' },
      { text: 'Ask if internet and routers are provided' },
      { text: 'Send a follow-up email thanking them for their time and confirming the move date' },
      {
        text: 'If the client is moving OUT of a senior community, communicate with the sales or move coordinator about the move out day and clean out day via email',
      },
      {
        text: "Take pictures of the new home noting outlets, tv/coax line, windows, depths of window sills, baseboards and chair rails, which way the doors swing, vents, HVAC, depth and number of cabinets, closet storage, and other items relevant to the client's needs",
      },
      { text: 'Do they need to purchase a shower curtain? If so, get the measurements' },
      { text: 'Take a video walkthrough, if possible, and load it to Google Drive' },
      { text: 'Confirm measurement of room with laser — be sure to make allowance for baseboards' },
      { text: 'Upload pictures of origination and destination to STWare' },
      { text: 'Create floor plan using Sweet Home 3D', anchor: 'secondVisit', offsetWorkdays: -1 },
      {
        text: 'Use the measuring tool in Sweet Home 3D to make sure walkways are safe and unobstructed and clearance for a walker or wheelchair is available (even if they do not currently need one)',
        anchor: 'secondVisit',
        offsetWorkdays: -1,
      },
      {
        text: 'The floor plan must be a JPEG to be compatible with Sweet Home 3D',
        anchor: 'secondVisit',
        offsetWorkdays: -1,
      },
      {
        text: 'Floor plan reveal — tap laptop to show the 2D layout of the floor plan. Make adjustments if the client needs changes',
        anchor: 'secondVisit',
      },
      {
        text: 'Upload final image of floor plan as a JPEG or PDF to STWare (page 2 of the Sweet Home 3D file)',
        anchor: 'secondVisit',
      },
      {
        text: 'Email final furniture inventory to movers (page 1 of the Sweet Home 3D file)',
        anchor: 'secondVisit',
      },
      { text: 'Request crating services, wardrobe boxes or other speciality boxes, if necessary', anchor: 'secondVisit' },
    ],
  },

  // ── Sort and Pack ───────────────────────────────────────────────────────────
  {
    id: 'sort-pack',
    name: 'Sort and Pack Visits',
    owner: 'Project Manager & Transition Specialists',
    anchor: 'sortDayLast',
    items: [
      {
        text: 'Pick up basic packing supplies prior to the sort and pack appointment',
        subItems: ['1–2 large boxes', '10 medium boxes', '10 small boxes', 'Packing paper', 'Tape', 'Sharpie'],
        anchor: 'sortDayFirst',
        offsetWorkdays: -1,
      },
      {
        text: 'Arrive FIFTEEN minutes prior to appointment to go over the plan with the team and unload supplies',
        anchor: 'sortDayFirst',
      },
      { text: 'While you are sorting have assistant build bumpers and boxes', anchor: 'sortDayFirst' },
      { text: 'Start in an easy area such as the linen closet, guest room, or guest bath', anchor: 'sortDayFirst' },
      {
        text: 'Try to use as much of the appointment time as possible, but if the client is getting flustered or having decision fatigue take a 15 minute break to give them a rest. The team can take 15 minutes at this time or continue to pack what has already been sorted',
      },
      {
        text: 'Tag with colored tape as you sort, make notes on tape if needed (example: number a lamp to match the number on the table, final pack, FAS — "find a spot", MM — "Move Morning")',
      },
      {
        text: 'Guide client through decisions, discuss downsizing, and understand their goals for their new lifestyle. Be patient, yet at the same time focus on the goal. Discover the heart of the home and how to translate that to the new home (see downsizing / sorting tip sheet)',
      },
      { text: 'Document preexisting damage if discovered on furniture and items, take pictures and inform client' },
      { text: 'Confirm details of cleanout / dispersal appointment with operations and client' },
      {
        text: 'IF the client has a real estate broker, coordinate the lockbox with the broker on behalf of the client and get the access code. If they do not have a broker, ask for a key, garage code, etc.',
      },
      { text: 'Confirm if there is a shed, crawl space or attic that will need to be addressed' },
      { text: 'Is an appointment with a high end auctioneer needed / confirmed?', requiresAuction: true },
      { text: 'If needed, remind client about auction funds split', requiresAuction: true },
      {
        text: 'Discuss market saturation with them, and if they prefer we can send to donation and obtain a receipt',
      },
      { text: 'Obtain signed contract for auction, if needed, to give to auction house', requiresAuction: true },
      { text: 'Update adult children on status of auction and donation arrangements, if needed' },
      {
        text: 'Review contract for document sorting. If the client is sorting, make boxes for them to separate shredding (if they have this service). Suggest that they keep:',
        subItems: [
          '3 years of tax returns OR recommendation from their accountant',
          'Investment documents',
          'Identification documents',
          'Titles',
          '1 year of medical documents',
        ],
      },
      {
        text: 'During the process assign EASY homework to the client. For example, if they wish to go through their book collection, assign it to them with clear deadlines and guidance on how to do it',
        anchor: 'sortDayFirst',
      },
    ],
  },

  // ── Outbound long distance ──────────────────────────────────────────────────
  {
    id: 'long-distance',
    name: 'Outbound Long Distance Move',
    owner: 'Project Manager',
    note: 'Only applies when this is an outbound long distance move.',
    anchor: 'finalPackDay',
    requiresLongDistance: true,
    items: [
      { text: 'Use extra packing materials to account for vibration time on the moving truck' },
      {
        text: 'NO liquids, perishables, flammables, combustibles, or plants should be put on moving trucks or in storage units',
      },
      { text: 'Artwork, mirrors, and televisions must be boxed or crated' },
      {
        text: 'Send inbound (destination) SMM the box count, furniture inventory, floor plan and move contact information',
      },
    ],
  },

  // ── Final Pack ──────────────────────────────────────────────────────────────
  {
    id: 'final-pack',
    name: 'Final Pack Visit',
    owner: 'Project Manager',
    anchor: 'finalPackDay',
    items: [
      { text: 'Send estimated box count to movers', offsetWorkdays: -1 },
      { text: "Discuss mover's optional protection per truckload", offsetWorkdays: -1 },
      {
        text: 'Make a plan for the client to carry prescriptions, phone, charger, credit cards, glasses, checkbook, personal documents, priceless heirlooms, etc.',
      },
      { text: 'Finalize all packing except for overnight use items' },
      { text: 'Record the time in the STWare notes that the alarm clocks are set to' },
      { text: 'Confirm with client which bedding set they would like used to make the bed on move day' },
      {
        text: 'Refresh the client on the Move Day Plan',
        subItems: [
          'Be ready to leave by 8:30am',
          'Make plans for a fun day',
          'Project Manager will call 30 minutes prior for pre-dinner time reveal (internal goal: 5:00 PM or earlier)',
        ],
      },
      { text: 'Remind client about final payment due at or before reveal and email the invoice' },
      { text: 'Pre-move large / fine art, kitchen and bathroom boxes' },
    ],
  },

  // ── Move Day ────────────────────────────────────────────────────────────────
  {
    id: 'move-day',
    name: 'Move Day',
    owner: 'Project Manager & Transition Specialists',
    anchor: 'moveDay',
    moveTypes: ['Full Move', 'Emergency Move', 'Downsize Only'],
    items: [
      { text: 'Project Manager purchases client gift, brings trash bags and floor plan copies' },
      { text: "Project Manager and Transition Specialists arrive at 8:15am (8:30 at the client's doorstep)" },
      { text: 'Project Manager helps client load personal items in their vehicle and sees them off for the day' },
      { text: 'Transition Specialists pack the overnight use items' },
      {
        text: 'Movers arrive at 9AM and Project Manager walks them through the origination home to confirm what they are taking',
      },
      {
        text: 'Project Manager oversees movers prepping furniture for moving and loading',
        subItems: [
          'Boxes MUST be loaded last so they come off first',
          'If there is a second stop, those items must be loaded first as they come off after the destination drop is complete',
          'Pack refrigerator items in coolers towards the end of the loading',
        ],
      },
      { text: 'Alert the destination team (additional Transition Specialists) of ETA' },
      { text: 'Project Manager and Transition Specialists hand carry cold items in the work van' },
      {
        text: 'Project Manager and Transition Specialists DOUBLE CHECK ALL cabinets, drawers, closets, etc. for any missed green / go-with items',
      },
      { text: "Do a final walkthrough with the movers' team lead to make sure no items were missed" },
      { text: 'Turn off lights' },
      { text: 'Secure home' },
      {
        text: 'IF there was a pre-move, arrange for the destination team to arrive earlier and gain access to start the unpack of the kitchen and bathrooms. Otherwise, the Transition Specialists from the origination gain access to the new unit and bring in the hand carry items while the Project Manager directs the movers to the parking lot unload area and the service elevators',
      },
      { text: 'Destination team should arrive around the same time' },
      {
        text: 'Project Manager holds a brief meeting with the team, assigns staff to areas of expertise, explains any special circumstances, sets expectations for reveal time and reviews the floor plan',
      },
      { text: 'Project Manager manages movers as they place furniture' },
      {
        text: 'All Transition Specialists unbox and resettle (Project Manager will assist after movers are complete)',
      },
      { text: 'Mount and hook up televisions and confirm service works' },
      { text: 'Send as much packing trash with the movers as possible' },
      {
        text: 'Project Manager double checks:',
        subItems: [
          'Moving truck is empty',
          'Bookcases have shelves properly installed',
          'Note any damage to furniture',
          'Mechanical items work (bed frames, lift chairs, Sleep Number beds)',
          'Headboard and footboard are tightened',
        ],
      },
      {
        text: 'THEN sign off on the bill of lading, tip movers, take a picture of the bill of lading and upload it to STWare',
      },
    ],
  },

  // ── Reveal ──────────────────────────────────────────────────────────────────
  {
    id: 'reveal',
    name: 'The Reveal',
    owner: 'Project Manager & Transition Specialists',
    note: 'Same day as the move — internal goal is 5:00 PM or earlier.',
    anchor: 'moveDay',
    moveTypes: ['Full Move', 'Emergency Move', 'Downsize Only'],
    items: [
      { text: 'Call client 30 minutes to 1 hour ahead of time' },
      { text: 'Dust and remove fingerprints from furnishings and glass' },
      { text: 'Remove green tags' },
      { text: 'Tuck cords, plug in and turn on lamps' },
      { text: 'Confirm television is connected and working' },
      {
        text: 'Confirm computer and printer are connected to the internet and power on — leave the browser open to leave a Google Review',
      },
      { text: 'Set alarm clock — refer to notes in STWare for the time' },
      { text: 'Vacuum and sweep' },
      { text: 'Hang pictures' },
      { text: 'Clear remaining trash' },
      { text: 'Check that the bed is made' },
      { text: 'Check that linens, towels, etc. in the closet are tidy' },
      { text: 'Dismiss extra Transition Specialists for the day as their area wraps up' },
      { text: 'Project Manager or Transition Specialist takes reveal photos and uploads them to STWare' },
      {
        text: 'Project Manager and one Transition Specialist stay for the reveal to welcome the client into the new home (when possible, invite the community liaison to attend)',
      },
      {
        text: 'Walk through with the client — point out how the kitchen and bath are organized, showcase the heart of the home, and share the client gift',
      },
      {
        text: "If you haven't already, email the final invoice to the client and walk through the ACH process via the invoice email. Assist them on THEIR device if they have challenges with ACH",
      },
      {
        text: 'Remind them about the dispersal / cleanout and that they have a set number of days to walk through the old home and make final arrangements for family to retrieve items',
      },
      { text: 'Ask for a 5 star Google Review — use your tap card' },
    ],
  },

  // ── Day After ───────────────────────────────────────────────────────────────
  {
    id: 'day-after',
    name: 'Day After the Move',
    owner: 'Project Manager',
    anchor: 'moveDay',
    offsetWorkdays: 1,
    moveTypes: ['Full Move', 'Emergency Move', 'Downsize Only'],
    items: [
      {
        text: 'Call client and ask how they are doing. Make sure they are settling in well. If you have not received a Google review, follow up with a text or email with the link',
      },
    ],
  },

  // ── Clean Out ───────────────────────────────────────────────────────────────
  {
    id: 'cleanout',
    name: 'Clean Out',
    owner: 'Project Manager & Team',
    anchor: 'cleanoutDay',
    moveTypes: ['Full Move', 'Emergency Move', 'Downsize Only', 'Cleanout'],
    items: [
      { text: 'Check house — every room — to confirm vacancy and lock all doors' },
      {
        text: 'Sift rooms one at a time in teams of two while creating an inventory of items that will be sold using Sortly',
      },
      {
        text: 'Bin or box items for auction pick up / delivery (you can use the boxes from move day)',
        requiresAuction: true,
      },
      { text: 'Manage auction items pick up (oversee movers)', anchor: 'auctionPickup', requiresAuction: true },
      { text: 'Project Manager takes shred to the designated drop off site' },
      { text: 'Project Manager takes electronics to the electronic disposal site' },
      { text: 'Follow movers to donation drop off to get receipt' },
      { text: 'Notify Director of Operations when Sortly is complete' },
    ],
  },
];

export const CHECKLIST_SECTIONS: ChecklistSectionTemplate[] = RAW_SECTIONS.map((section) => ({
  ...section,
  items: section.items.map((item) => ({ ...item, id: hashId(section.id, item.text) })),
}));
