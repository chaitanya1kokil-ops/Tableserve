import LegalLayout, { Section } from './LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="July 9, 2026">
      <Section heading="1. Overview">
        <p>
          This policy explains what information TableServe collects, how we use it, and the
          choices you have. It covers both restaurant users (owners and staff with accounts) and
          diners who order through a restaurant's TableServe menu. We collect the minimum we need
          to run the Service and we do not sell personal information.
        </p>
      </Section>

      <Section heading="2. Information we collect">
        <p>
          <strong className="text-stone-800">From restaurants:</strong> your name, email address,
          and password (stored as a secure hash); your restaurant profile (name, address, phone,
          logo, hours, tax rate, branding); your menu content; and the orders and payment records
          (method, amount, tip) created while running your restaurant.
        </p>
        <p>
          <strong className="text-stone-800">From diners:</strong> we do not ask for your name,
          email, phone number, or any account. Scanning a table QR code creates a temporary
          anonymous session identifier so your orders stay linked to your table. We store the
          contents of your orders, any notes you add (for example allergy information), and the
          table you ordered from. Your cart is kept in your own browser's local storage until you
          place the order.
        </p>
        <p>
          <strong className="text-stone-800">Automatically:</strong> standard technical logs such
          as IP address, browser type, and timestamps, used for security and to keep the Service
          running.
        </p>
        <p>
          <strong className="text-stone-800">What we never collect:</strong> payment card numbers.
          Card payments are handled entirely by the restaurant's payment terminal and its
          provider; TableServe only records that a bill was paid, by which method, and for how
          much.
        </p>
      </Section>

      <Section heading="3. How we use information">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>to deliver orders from a diner's phone to the restaurant's dashboard and kitchen;</li>
          <li>to show restaurants their own sales, order history, and reports;</li>
          <li>to operate, secure, debug, and improve the Service;</li>
          <li>to communicate with restaurant account holders about the Service;</li>
          <li>to comply with legal obligations.</li>
        </ul>
      </Section>

      <Section heading="4. How information is shared">
        <p>
          <strong className="text-stone-800">With the restaurant you order from:</strong> when a
          diner places an order, the restaurant sees the order contents, notes, table, and order
          history for that table. Restaurants only ever see data for their own restaurant.
        </p>
        <p>
          <strong className="text-stone-800">With service providers:</strong> we run on trusted
          infrastructure providers, currently Supabase (database, authentication, and realtime
          updates) and Vercel (application hosting). If a restaurant connects a payment provider
          (such as Square), payment requests are shared with that provider to process the
          transaction. These providers process data on our behalf under their own security and
          privacy commitments.
        </p>
        <p>
          <strong className="text-stone-800">Otherwise:</strong> we do not sell or rent personal
          information. We may disclose information if required by law or to protect the rights and
          safety of TableServe, our users, or the public.
        </p>
      </Section>

      <Section heading="5. Cookies and local storage">
        <p>
          TableServe uses browser storage for functional purposes only: keeping restaurant users
          signed in, maintaining a diner's anonymous session, and holding a diner's cart before an
          order is placed. We do not use advertising cookies or third-party trackers.
        </p>
      </Section>

      <Section heading="6. Data retention">
        <p>
          Order and payment records are retained for as long as the restaurant's account exists,
          because they are the restaurant's business records. When a restaurant deletes its
          account, its data is deleted. Diner sessions are anonymous and are not linked to any
          identity; cart data lives only on the diner's own device.
        </p>
      </Section>

      <Section heading="7. Security">
        <p>
          Data is encrypted in transit, access is controlled with row-level security so each
          restaurant can only reach its own data, and passwords are stored only as cryptographic
          hashes. No system is perfectly secure, but we design the Service so that a diner never
          has to hand over personal information in the first place.
        </p>
      </Section>

      <Section heading="8. Your rights">
        <p>
          Subject to Canadian privacy law (PIPEDA), you may request access to, correction of, or
          deletion of your personal information, and you may withdraw consent where consent is the
          basis for processing. Restaurant account holders can edit most information directly in
          Settings. For anything else, contact us using the address below and we will respond
          within a reasonable time.
        </p>
      </Section>

      <Section heading="9. Children">
        <p>
          TableServe accounts are for businesses and are not directed to children. Diners of any
          age may be handed a menu QR code in a restaurant, but we do not knowingly collect
          personal information from children; diner sessions are anonymous by design.
        </p>
      </Section>

      <Section heading="10. Where data is stored">
        <p>
          Our infrastructure providers may store and process data in data centres outside your
          province or outside Canada. Wherever data is processed, it remains protected by this
          policy and by our agreements with those providers.
        </p>
      </Section>

      <Section heading="11. Changes to this policy">
        <p>
          If we make material changes to this policy, we will give notice through the Service or
          by email to restaurant account holders before the changes take effect. The effective
          date at the top of this page shows when it was last revised.
        </p>
      </Section>

      <Section heading="12. Contact">
        <p>
          Privacy questions or requests? Email{' '}
          <a href="mailto:chaitanya1kokil@gmail.com" className="font-medium text-brand hover:underline">
            chaitanya1kokil@gmail.com
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  )
}
