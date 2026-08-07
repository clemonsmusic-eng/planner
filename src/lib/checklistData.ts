import type { ChecklistTemplateSection } from '../types';

/**
 * ─── PM Checklist Template ────────────────────────────────────────────────────
 *
 * Transcribed from the Smooth Transitions PM Checklist (rev. with Client/
 * Community visit split, MaxSold, and the Before/During/After visit grouping).
 * Section and item order follow that document; due dates do not. Each item
 * names an `anchor` — a milestone the move plan builder computes (see
 * ScheduleResult.suggestedDates) — plus an offset from it, so the checklist
 * re-dates itself whenever the plan is regenerated.
 *
 * anchor            resolves to
 * ────────────────  ────────────────────────────────────────────────────────────
 * earliest-start    inputs.earliestStartDate
 * first-visit       suggestedDates.firstVisit
 * second-visit      suggestedDates.secondVisit   (the floor plan reveal)
 * sort-start        first sort & pack day
 * sort-end          last sort & pack day
 * final-pack        suggestedDates.finalPackDay
 * move-day          suggestedDates.moveDay
 * cleanout-start    first cleanout day        (requires: 'cleanout')
 * cleanout-end      last cleanout day         (requires: 'cleanout')
 * lot-prep-start    first lot prep day        (requires: 'auction')
 * lot-prep-end      last lot prep day         (requires: 'auction')
 * auction-lot-org   auction lot organization  (requires: 'auction')
 * auction-start     auction opening date      (requires: 'auction')
 * auction-pickup-prep  pickup prep day        (requires: 'auction')
 * auction-pickup    auction pickup day        (requires: 'auction')
 * hard-deadline     inputs.hardDeadline
 *
 * `offsetMode: 'workday'` skips weekends; `'calendar'` does not. Items within a
 * section render in the order below when they share a due date, so the Move Day
 * and Reveal sequences stay in running order.
 *
 * This template is seeded into Settings → Checklist Template on first run and is
 * editable there; edits persist to localStorage and override these defaults.
 */

/** Standing instruction from the head of the source document. */
export const CHECKLIST_STANDING_NOTE =
  'Throughout the process add notes to STWare and save emails from clients in STWare for reference by all team members.';

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplateSection[] = [
  {
    id: 'sec-assignment',
    name: 'After PM Assignment',
    order: 1,
    description: 'Complete within 2 business days of assignment — Project Manager',
    items: [
      { id: 'as-2', text: 'Read notes in STWare and review invoice for services', anchor: 'first-visit', offsetDays: -3, offsetMode: 'workday', owner: 'PM' },
      { id: 'as-1', text: '"Reply All" to the introductory email from the Director of Operations to introduce yourself', anchor: 'first-visit', offsetDays: -3, offsetMode: 'workday', owner: 'PM' },
      { id: 'as-3', text: 'Contact community to schedule site visit', anchor: 'first-visit', offsetDays: -3, offsetMode: 'workday', owner: 'PM' },
      { id: 'as-4', text: 'Book movers — 1200 sq ft+ have a 2nd move truck on standby', anchor: 'first-visit', offsetDays: -3, offsetMode: 'workday', owner: 'PM' },
      { id: 'as-5', text: 'Create paper folder to store all receipts that you will save for the client', anchor: 'first-visit', offsetDays: -3, offsetMode: 'workday', owner: 'PM' },
      { id: 'as-6', text: 'Send an email, call, or text the client the day before as a reminder of your upcoming visit', anchor: 'first-visit', offsetDays: -1, offsetMode: 'workday', owner: 'PM', note: 'Repeat before every visit.' },
    ],
  },
  {
    id: 'sec-firstvisit',
    name: 'First Visit & Measurements',
    order: 2,
    description: 'Client visit, then community visit, then the work that follows both.',
    items: [
      // ── Client Visit ──
      { id: 'fv-1', text: 'Place your business card in the ST folder', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', note: 'The folder should have been left with the client by the Director of Business Operations.' },
      { id: 'fv-2', text: 'Confirm schedule of appointments, new address, and point of contact at community. Leave a written copy of appointments and briefly explain the plan for each visit', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-4', text: 'Explain our colored masking tape system', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', note: 'RED — stays in home for dispersal. GREEN — goes to new home. BLUE — goes to family. ORANGE — donation. YELLOW — other designations. Do not put tape directly on gold leaf, paintings, or delicate finishes.' },
      { id: 'fv-5', text: 'Take pictures and measurements of the furniture "wishlist" (width across front edge and the depth)', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-6', text: 'Take pictures of the entire room in its natural state', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-7', text: 'Use a legal pad or furniture inventory sheet to track number, description, measurements, and which room each piece should go to', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-8', text: 'Use the alphanumeric numbering system for furniture — A1, A2, B1, B2, etc.', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-9', text: 'Check that Sleep Number beds, mechanical platform beds, and lift recliners are working properly', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-12', text: 'Get email / contact information', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Client' },
      // ── Community Visit ──
      { id: 'fv-17', text: 'Ask if internet and routers are provided', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Community' },
      { id: 'fv-10', text: 'At the site visit say "hello" and check in at the front desk', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-11', text: "Ask to speak with the client's move-in coordinator to request access to the apartment, or the client's salesperson if there is no move-in coordinator", anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Community' },
      { id: 'fv-3', text: "Ask for a copy of the community floor plan if you don't already have one", anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Community' },
      { id: 'fv-13', text: 'Confirm move date', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Community' },
      { id: 'fv-14', text: 'Ask about move day procedures, moving truck parking, service elevator use and padding, and whether you can use onsite trash and recycling receptacles', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Community' },
      { id: 'fv-16', text: 'Ask if cable boxes are provided and if so, how many', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Community' },
      { id: 'fv-15', text: 'Ask about TV mounting', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Community' },
      { id: 'fv-23', text: 'If the client is moving OUT of a senior community, email the sales or move coordinator about the move out day and clean out day', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-22', text: 'Send a follow-up email thanking them for their time and confirming the move date', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-18', text: "Take pictures of the new home noting outlets, TV/coax line, windows, window sill depths, baseboards and chair rails, which way doors swing, vents, HVAC, cabinet depth and count, closet storage, and anything else relevant to the client's needs", anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-20', text: 'Take a video walkthrough, if possible, and load it to Google Drive', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-19', text: 'Do they need to purchase a shower curtain? If so, get the measurements', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-21', text: 'Confirm measurement of room with laser — make allowance for baseboards', anchor: 'first-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      // ── After Client and Community Visits ──
      { id: 'fv-24', text: 'Upload pictures of origination and destination to STWare', anchor: 'first-visit', offsetDays: 1, offsetMode: 'workday', owner: 'PM' },
      { id: 'fv-25', text: 'Create floor plan using Sweet Home 3D', anchor: 'second-visit', offsetDays: -2, offsetMode: 'workday', owner: 'PM' },
      { id: 'fv-26', text: "Use the measuring tool in Sweet Home 3D to confirm walkways are safe and unobstructed, with clearance for a walker or wheelchair even if they don't currently need one", anchor: 'second-visit', offsetDays: -2, offsetMode: 'workday', owner: 'PM' },
      { id: 'fv-27', text: 'The floor plan must be a JPEG to be compatible with Sweet Home 3D', anchor: 'second-visit', offsetDays: -2, offsetMode: 'workday', owner: 'PM' },
      { id: 'fv-28', text: 'Floor plan reveal — tap laptop to show the 2D layout. Make adjustments if the client needs changes, then upload the final image as a JPEG or PDF to STWare (page 2 of the Sweet Home 3D file)', anchor: 'second-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fv-30', text: 'Email final furniture inventory to movers (page 1 of the Sweet Home 3D file)', anchor: 'second-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Movers' },
      { id: 'fv-31', text: 'Request crating services, wardrobe boxes, or other specialty boxes, if necessary', anchor: 'second-visit', offsetDays: 0, offsetMode: 'calendar', owner: 'Movers' },
    ],
  },
  {
    id: 'sec-sortpack',
    name: 'Sort & Pack Visits',
    order: 3,
    items: [
      { id: 'sp-13', text: 'Review contract for document sorting. If the client is sorting, make boxes for them to separate shredding', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', note: "Suggest they keep: 3 years of tax returns or their accountant's recommendation; investment documents; identification documents; titles; 1 year of medical documents." },
      { id: 'sp-1', text: 'Pick up basic packing supplies prior to the sort and pack appointment', anchor: 'sort-start', offsetDays: -1, offsetMode: 'workday', owner: 'PM', note: 'Suggested list: 1–2 large boxes, 10 medium boxes, 10 small boxes, packing paper, tape, Sharpie.' },
      { id: 'sp-2', text: 'Arrive FIFTEEN minutes prior to appointment to go over the plan with the team and unload supplies', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'sp-3', text: 'While you are sorting, have the assistant build bumpers and boxes', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'sp-4', text: 'Start in an easy area such as the linen closet, guest room, or guest bath', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'sp-5', text: 'Use as much of the appointment time as possible, but if the client is flustered or has decision fatigue, take a 15 minute break', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', note: 'The team can take 15 minutes at this time or continue to pack what has already been sorted.' },
      { id: 'sp-6', text: 'Tag with colored tape as you sort; make notes on the tape if needed', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist', note: 'Examples: number a lamp to match the number on the table; final pack; FAS — "find a spot"; MM — "Move Morning".' },
      { id: 'sp-7', text: 'Guide the client through decisions, discuss downsizing, and understand their goals for their new lifestyle', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', note: 'Be patient, yet focused on the goal. Discover the heart of the home and how to translate that to the new home — see the downsizing / sorting tip sheet.' },
      { id: 'sp-8', text: 'Document preexisting damage discovered on furniture and items — take pictures and inform the client', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'sp-12', text: 'Confirm whether there is a shed, crawl space, or attic that needs to be addressed', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'sp-9', text: 'Assign EASY homework to the client with clear deadlines and guidance', anchor: 'sort-start', offsetDays: 0, offsetMode: 'calendar', owner: 'Client', note: 'For example, if they wish to go through their book collection, assign it to them.' },
      { id: 'sp-10', text: 'Confirm details of cleanout / dispersal appointment with operations and client', anchor: 'sort-start', offsetDays: 1, offsetMode: 'workday', owner: 'PM' },
      { id: 'sp-11', text: 'If the client has a real estate broker, coordinate the lockbox on their behalf and get the access code. If not, ask for a key, garage code, etc.', anchor: 'sort-start', offsetDays: 1, offsetMode: 'workday', owner: 'PM' },
      { id: 'sp-14', text: 'Is an appointment with a high end auctioneer needed / confirmed?', anchor: 'sort-end', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', requires: 'auction' },
      { id: 'sp-15', text: 'If needed, remind the client about the auction funds split', anchor: 'sort-end', offsetDays: 0, offsetMode: 'calendar', owner: 'Client', requires: 'auction' },
      { id: 'sp-17', text: 'Discuss market saturation — if they prefer, we can send items to donation and obtain a receipt', anchor: 'sort-end', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'sp-16', text: 'Obtain signed contract for auction, if needed, to give to the auction house', anchor: 'sort-end', offsetDays: 0, offsetMode: 'calendar', owner: 'Client', requires: 'auction' },
      { id: 'sp-18', text: 'Update adult children on the status of auction and donation arrangements, if needed', anchor: 'sort-end', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
    ],
  },
  {
    id: 'sec-longdistance',
    name: 'Outbound Long Distance Move',
    order: 4,
    description: "Shown when the project's move type is Long Distance Move.",
    moveTypes: ['Long Distance Move'],
    items: [
      { id: 'ld-2', text: 'Use extra packing materials to account for vibration time on the moving truck', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'ld-3', text: 'NO liquids, perishables, flammables, combustibles, or plants on moving trucks or in storage units', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'ld-4', text: 'Artwork, mirrors, and televisions must be boxed or crated', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'ld-1', text: 'Send the inbound (destination) SMM the box count, furniture inventory, floor plan, and move contact information', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
    ],
  },
  {
    id: 'sec-finalpack',
    name: 'Final Pack & Pre-Move Visit',
    order: 5,
    items: [
      { id: 'fp-3', text: 'Make a plan for the client to carry their essentials', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Client', note: 'Prescriptions, phone, charger, credit cards, glasses, checkbook, personal documents, priceless heirlooms, etc.' },
      { id: 'fp-4', text: 'Finalize all packing except for overnight use items', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'fp-5', text: 'Record in the STWare notes the time the alarm clocks are set to', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'fp-6', text: 'Confirm with the client which bedding set they would like used to make the bed on move day', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Client' },
      { id: 'fp-9', text: 'Pre-move large / fine art, kitchen, and bathroom boxes', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'fp-7', text: 'Refresh the client on the Move Day Plan', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'Client', note: 'Be ready to leave by 8:30am. Make plans for a fun day. The Project Manager will call 30 minutes prior for the pre-dinner reveal (internal goal: 5:00 PM or earlier).' },
      { id: 'fp-8', text: 'Remind the client about final payment due at or before reveal, and email the invoice', anchor: 'final-pack', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      // After the visit
      { id: 'fp-1', text: 'Send estimated box count to movers', anchor: 'final-pack', offsetDays: 1, offsetMode: 'calendar', owner: 'Movers' },
      { id: 'fp-2', text: "Discuss the mover's optional protection per truckload", anchor: 'final-pack', offsetDays: 1, offsetMode: 'calendar', owner: 'Movers' },
    ],
  },
  {
    id: 'sec-moveday',
    name: 'Move Day',
    order: 6,
    items: [
      // ── Before arrival ──
      { id: 'md-1', text: 'Project Manager purchases client gift, gets cash to tip movers, and brings trash bags and floor plan copies', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      // ── At origin ──
      { id: 'md-2', text: 'Project Manager and Transition Specialists arrive at 8:15am (8:30 at the doorstep)', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-3', text: 'Project Manager helps the client load personal items into their vehicle and sees them off for the day', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-4', text: 'Transition Specialists pack the overnight use items', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'md-5', text: 'Movers arrive at 9AM; Project Manager walks them through the origination home to confirm what they are taking', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Movers' },
      { id: 'md-6', text: 'Project Manager oversees movers prepping furniture for moving and loading', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-7', text: 'Boxes MUST be loaded last so they come off first', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Movers' },
      { id: 'md-8', text: 'If there is a second stop, those items must be loaded first as they come off after the destination drop is complete', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Movers' },
      { id: 'md-9', text: 'Pack refrigerator items in coolers towards the end of the loading', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'md-10', text: 'Alert the destination team of ETA', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-12', text: 'DOUBLE CHECK ALL cabinets, drawers, closets, etc. for any missed green / go-with items', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'md-13', text: "Do a final walkthrough with the movers' team lead to make sure no items were missed", anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-14', text: 'Turn off lights', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-15', text: 'Secure home', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      // ── Transition / at destination ──
      { id: 'md-11', text: 'Project Manager and Transition Specialists hand carry cold items in the work van', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'md-16', text: 'If there was a pre-move, arrange for the destination team to arrive earlier and start the unpack of the kitchen and bathrooms', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', note: 'Otherwise, the Transition Specialists from the origination gain access to the new unit and bring in hand-carry items while the Project Manager directs the movers to the unload area and service elevators.' },
      { id: 'md-17', text: 'Destination team arrives around the same time', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'md-18', text: 'Project Manager holds a brief team meeting — assign staff to areas of expertise, explain special circumstances, set reveal-time expectations, and review the floor plan', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-19', text: 'Project Manager manages movers as they place furniture', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-20', text: 'All Transition Specialists unbox and resettle (Project Manager assists after movers are complete)', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'md-21', text: 'Mount and hook up televisions and confirm service works', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'md-22', text: 'Send as much packing trash with the movers as possible', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Movers' },
      // ── Before the movers leave ──
      { id: 'md-23', text: 'Before movers leave, double check: moving truck is empty', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-24', text: 'Before movers leave, double check: bookcases have shelves properly installed', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-25', text: 'Before movers leave, double check: note any damage to furniture', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-26', text: 'Before movers leave, double check: mechanical items work — bed frames, lift chairs, Sleep Number beds', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-27', text: 'Before movers leave, double check: headboard and footboard are tightened', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'md-28', text: 'Sign off on the bill of lading, tip movers, photograph the bill of lading, and upload it to STWare', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
    ],
  },
  {
    id: 'sec-reveal',
    name: 'The Reveal',
    order: 7,
    description: 'Internal goal: 5:00 PM or earlier.',
    items: [
      { id: 'rv-1', text: 'Call client 30 minutes to 1 hour ahead of time', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'rv-2', text: 'Dust and remove fingerprints from furnishings and glass', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-3', text: 'Remove green tags', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-4', text: 'Tuck cords, plug in and turn on lamps', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-5', text: 'Confirm television is connected and working', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-6', text: 'Confirm computer and printer are connected to the internet and powered on — leave the browser open to leave a Google Review', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-7', text: 'Set alarm clock — refer to notes in STWare for the time', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-8', text: 'Vacuum and sweep', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-9', text: 'Hang pictures', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-10', text: 'Clear remaining trash', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-11', text: 'Check that the bed is made', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-12', text: 'Check that linens, towels, etc. in the closet are tidy', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      { id: 'rv-13', text: 'Dismiss extra Transition Specialists for the day as their area wraps up', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'rv-14', text: 'Take reveal photos and upload them to STWare', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'rv-15', text: 'Project Manager and one Transition Specialist stay for the reveal to welcome the client into the new home', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM', note: 'When possible, invite the community liaison to attend.' },
      { id: 'rv-16', text: 'Walk through with the client — point out how the kitchen and bath are organized, showcase the heart of the home, and share the client gift', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'rv-17', text: "If you haven't already, email the final invoice and walk the client through the ACH process. Assist on THEIR device if they have challenges with ACH", anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'rv-18', text: 'Remind the client about the dispersal / cleanout and how many days they have to walk through the old home and let family retrieve items', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'Client' },
      { id: 'rv-19', text: 'Ask for a 5 Star Google Review — use your tap card', anchor: 'move-day', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
    ],
  },
  {
    id: 'sec-dayafter',
    name: 'Day After the Move',
    order: 8,
    items: [
      { id: 'da-1', text: 'Call the client and ask how they are doing; make sure they are settling in well', anchor: 'move-day', offsetDays: 1, offsetMode: 'calendar', owner: 'PM', note: 'If you have not received a Google review, follow up with a text or email with the link.' },
    ],
  },
  {
    id: 'sec-cleanout',
    name: 'Clean Out',
    order: 9,
    description: 'Shown when cleanout is enabled on the project.',
    requires: 'cleanout',
    items: [
      { id: 'co-1', text: 'Check the house — every room — to confirm vacancy and lock all doors', anchor: 'cleanout-start', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'co-2', text: 'Sift rooms one at a time in teams of two while creating an inventory of items that will be sold, using MaxSold', anchor: 'cleanout-start', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist' },
      // Lot prep is its own scheduled phase, so this rides that rather than the cleanout day.
      { id: 'co-3', text: 'Bin or box items for auction pick up / delivery (you can use the boxes from move day)', anchor: 'lot-prep-start', offsetDays: 0, offsetMode: 'calendar', owner: 'Specialist', requires: 'auction' },
      { id: 'co-4', text: 'Manage auction items pick up (oversee movers)', anchor: 'auction-pickup', offsetDays: 0, offsetMode: 'calendar', owner: 'Movers', requires: 'auction' },
      { id: 'co-5', text: 'Take shred to the designated drop off site', anchor: 'cleanout-end', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'co-6', text: 'Take electronics to the electronic disposal site', anchor: 'cleanout-end', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'co-7', text: 'Follow movers to the donation drop off to get the receipt', anchor: 'cleanout-end', offsetDays: 0, offsetMode: 'calendar', owner: 'PM' },
      { id: 'co-8', text: 'Notify the Director of Operations when MaxSold is complete', anchor: 'cleanout-end', offsetDays: 1, offsetMode: 'workday', owner: 'Dir. Ops' },
    ],
  },
];

/** Human labels for anchors, used in the UI and the template editor. */
export const ANCHOR_LABELS: Record<string, string> = {
  'earliest-start': 'Earliest Start',
  'first-visit': 'First Visit',
  'second-visit': 'Second Visit',
  'sort-start': 'First Sort Day',
  'sort-end': 'Last Sort Day',
  'final-pack': 'Final Pack Day',
  'move-day': 'Move Day',
  'cleanout-start': 'Cleanout Start',
  'cleanout-end': 'Cleanout End',
  'lot-prep-start': 'Lot Prep Start',
  'lot-prep-end': 'Lot Prep End',
  'auction-lot-org': 'Auction Lot Org',
  'auction-start': 'Auction Start',
  'auction-pickup-prep': 'Pickup Prep',
  'auction-pickup': 'Auction Pickup',
  'hard-deadline': 'Hard Deadline',
};

export const CHECKLIST_OWNERS = [
  'Dir. Bus. Dev',
  'Dir. Ops',
  'PM',
  'Specialist',
  'Movers',
  'Client',
  'Community',
] as const;
