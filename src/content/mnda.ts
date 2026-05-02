// Source of truth for the Mutual NDA + Non-Circumvention + Fee Agreement.
// Bump MNDA_VERSION whenever the text below is materially changed; existing
// users will be required to re-sign because we record the version they signed.
//
// ⚠️ LEGAL: The fee structure (Section 8) and the explicit 8% liquidated
// damages clause (Section 9) are draft language. Have outside counsel review
// before this is presented to a counterparty in a real deal.

export const MNDA_VERSION = "v2";

export const MNDA_DISCLOSING_PARTY = {
  name: "Livio Building Systems, Inc.",
  address: "171 Main Street #562, Los Altos, CA 94022",
  signer: "Navneet Aron",
  title: "Founder & CEO",
};

export const MNDA_TITLE =
  "Mutual NDA, Fee Agreement & Non-Circumvention Agreement";

export const MNDA_INTRO = `This Agreement is entered into between Livio Building Systems, Inc., 171 Main Street #562, Los Altos, CA 94022 ("Livio"), and you on behalf of your organization (together, the "Parties").

The Parties want to use the Livio Land marketplace to find a counterparty for the sale, lease, or joint-venture development of utility-ready land for data center use (the "Purpose"). To do that, the Parties may need to share sensitive information and will rely on Livio to make introductions. This Agreement sets out the ground rules for keeping that information confidential, paying Livio a fair fee when a deal closes, and dealing with each other fairly afterwards.`;

export const MNDA_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. What Counts as Confidential Information",
    body: `"Confidential Information" means anything one Party (the "Disclosing Party") shares with the other (the "Receiving Party") in connection with the Purpose — in any form, before or after the Effective Date — including business plans, financial data, pricing, technology, trade secrets, intellectual property, customer and supplier relationships, and the existence and terms of this Agreement. Notes or summaries that incorporate shared information are also covered.

The following are not Confidential Information (except personal data, which is always protected):

(a) information that becomes publicly known through no fault of the Receiving Party;
(b) information the Receiving Party lawfully obtains from a third party with no confidentiality restriction; or
(c) information the Receiving Party independently develops without using anything shared under this Agreement.`,
  },
  {
    heading: "2. How to Use (and Not Use) the Information",
    body: `Each Receiving Party agrees to: (a) use Confidential Information only for the Purpose; (b) not share it without the Disclosing Party's prior written consent; and (c) maintain reasonable safeguards to protect it. The Receiving Party is responsible for any misuse by its own authorized representatives.

Sharing with authorized representatives (employees, advisors, and affiliates who need the information to evaluate the Purpose and are bound by equivalent confidentiality obligations) is permitted. Neither Party may use Confidential Information to compete directly with the other or to pursue substantially the same projects the other Party has specifically disclosed under this Agreement.`,
  },
  {
    heading: "3. If Disclosure Is Required by Law",
    body: `If legally required to disclose Confidential Information, the Receiving Party will (where permitted) promptly notify the Disclosing Party so it can seek a protective order. Only the minimum legally required portion will be disclosed, and the Receiving Party will request that confidential treatment be accorded. Routine regulatory examinations not specifically targeting the Disclosing Party are exempt from the notice requirement.`,
  },
  {
    heading: "4. Return or Destruction of Information",
    body: `Upon written request, the Receiving Party will promptly destroy (or return, if requested) all Confidential Information in its possession and confirm compliance in writing. Copies required for legal compliance or legitimate records-retention may be kept.`,
  },
  {
    heading: "5. Ownership",
    body: `Sharing information under this Agreement does not transfer any intellectual property rights or other ownership interests. Each Party retains full ownership of everything it discloses.`,
  },
  {
    heading: "6. No Warranties / No Partnership",
    body: `Confidential Information is shared as-is, with no warranty as to accuracy or completeness. This Agreement does not create a partnership, joint venture, or agency relationship between you and Livio, and does not obligate any Party to enter into any further deal. Each Party bears its own costs. Sharing privileged materials does not waive any attorney-client or work-product privilege.`,
  },
  {
    heading: "7. How Long This Agreement Lasts",
    body: `Confidentiality obligations last 4 years from the Effective Date — indefinitely for information that qualifies as a trade secret under applicable law. The fee and non-circumvention obligations (Sections 8 and 9) last 4 years from the date of the last Contact introduction made through Livio Land. Either Party may close their account on 30 days' written notice, but obligations under Sections 1, 8, and 9 survive termination.`,
  },
  {
    heading: "8. Fee Structure (2% Buyer + 2% Seller)",
    body: `In exchange for using Livio Land to source counterparties, the Parties agree that for any Transaction (defined below) sourced through the platform, Livio will be paid a success fee equal to:

  • 2.0% of the total Transaction value, paid by the Buyer-side party (the data center developer, off-taker, or acquirer); and
  • 2.0% of the total Transaction value, paid by the Seller-side party (the landowner or lessor).

The fee is earned and payable upon Closing.

"Transaction" means any sale, lease, option, joint venture, development partnership, or similar arrangement involving land that was first introduced to a counterparty through Livio Land. "Closing" means the earlier of (a) execution of a binding purchase and sale agreement, lease, or joint-venture agreement, or (b) any equivalent definitive agreement under which a Party becomes contractually obligated to perform — even if the actual transfer of funds, recording, or closing of escrow occurs later.

Total Transaction value includes the headline purchase price, lease consideration over the full term (PV-discounted at the prevailing 10-year Treasury rate), and the fair market value of any non-cash consideration (equity, in-kind contributions, contingent payments based on reasonable expected value).

Each Party will pay its share of the success fee to Livio within 10 business days of Closing by wire transfer to an account Livio designates in writing. Late payments accrue interest at 1.5% per month (or the maximum legal rate, if lower).`,
  },
  {
    heading: "9. Non-Circumvention & Liquidated Damages",
    body: `Neither Party will circumvent Livio Land — directly or through affiliates, employees, agents, or other representatives — to avoid the fees in Section 8 with respect to any Contact introduced through the platform.

"Contacts" means any third party, company, or entity specifically introduced through Livio Land within 48 months of such introduction. These restrictions do not apply to contacts the Receiving Party can demonstrably prove they already knew (with written records pre-dating the introduction) or that were independently introduced by an unrelated third party with no connection to Livio.

Examples of circumvention include: (a) closing a Transaction with a Contact off-platform after the introduction was made on-platform; (b) routing a Transaction through an affiliate, broker, or shell entity to avoid the platform; or (c) instructing a Contact to deal with a different entity to bypass the fee.

Liquidated damages: The Parties agree that actual damages from circumvention would be difficult to calculate but will at minimum include the lost success fee plus the cost of detection and enforcement. Therefore, in addition to any other remedies available at law or in equity, a Party that circumvents this Agreement will pay the non-breaching Parties (Livio and the original counterparty) liquidated damages equal to 8% of the total value of the circumventing Transaction, plus all reasonable attorney fees, expert fees, and costs of investigation and enforcement. The Parties acknowledge that this 8% figure is a reasonable estimate of likely actual harm and is not a penalty.`,
  },
  {
    heading: "10. Enforcement",
    body: `Because a breach of Sections 1, 2, 8, or 9 could cause irreparable harm that money alone cannot fix, any non-breaching Party may seek injunctive or other equitable relief without posting a bond. The prevailing Party in any legal proceeding to enforce this Agreement may recover court costs and reasonable attorney fees.`,
  },
  {
    heading: "11. General",
    body: `Entire Agreement. This is the complete agreement between the Parties on confidentiality, fees, and non-circumvention, and supersedes all prior discussions on those topics.

Changes. Any amendment must be in writing and signed by both Parties. Failing to enforce a right at any time does not waive it.

Assignment. Neither Party may assign this Agreement without the other's prior written consent, except that Livio may assign to a successor in connection with a merger, sale of substantially all assets, or reorganization.

Governing Law. California law governs this Agreement. Both Parties consent to exclusive jurisdiction in the state and federal courts located in Santa Clara County, California.

Severability. If any provision is found unenforceable, the rest of the Agreement remains in full effect, and the unenforceable provision is reformed to the minimum extent necessary to make it enforceable.

Notices. All notices must be in writing, sent to each Party's address listed above (or updated address provided in writing), and are effective the next business day if sent by overnight courier or email, or upon actual receipt otherwise.

Counterparts. This Agreement may be signed in counterparts and electronically, each of which is an original, and all of which together form one instrument. Clicking "I AGREE" on the Livio Land platform constitutes an electronic signature with the same force and effect as a handwritten signature.`,
  },
];
