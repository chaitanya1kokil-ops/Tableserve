import LegalLayout, { Section } from './LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Use" effectiveDate="July 9, 2026">
      <Section heading="1. Agreement to these terms">
        <p>
          These Terms of Use govern your access to and use of TableServe, a QR-code ordering and
          point-of-sale platform for restaurants ("the Service"). By creating an account, placing
          an order through a TableServe menu, or otherwise using the Service, you agree to these
          terms. If you do not agree, do not use the Service.
        </p>
      </Section>

      <Section heading="2. What TableServe does">
        <p>
          TableServe lets restaurants publish a digital menu, generate table QR codes, receive
          orders in real time, and record payments. Diners can browse a restaurant's menu, place
          orders from their table, track order status, and request their bill. TableServe is a
          software platform: the food, service, and fulfilment of every order are the sole
          responsibility of the restaurant.
        </p>
      </Section>

      <Section heading="3. Accounts">
        <p>
          Restaurant accounts require a valid email address and accurate information. You are
          responsible for safeguarding your login credentials and for all activity under your
          account, including activity by your staff. You must be at least the age of majority in
          your province or territory to open a restaurant account.
        </p>
        <p>
          Diners do not create accounts. Scanning a table QR code starts a temporary anonymous
          session used only to associate your orders with your table.
        </p>
      </Section>

      <Section heading="4. Restaurant responsibilities">
        <p>As a restaurant using TableServe, you are responsible for:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>the accuracy of your menu, prices, descriptions, and photos;</li>
          <li>food safety, allergen handling, and responding to dietary notes left by diners;</li>
          <li>configuring the correct tax rate and complying with all applicable tax laws;</li>
          <li>fulfilling orders placed through the Service or promptly cancelling them;</li>
          <li>holding all licences and permits required to operate your business.</li>
        </ul>
      </Section>

      <Section heading="5. Ordering as a diner">
        <p>
          An order placed through TableServe is a request sent directly to the restaurant. The
          contract for the meal is between you and the restaurant. Questions, complaints, refunds,
          and disputes about food or service should be raised with the restaurant. Prices and
          totals, including tax, are set by the restaurant.
        </p>
      </Section>

      <Section heading="6. Payments">
        <p>
          TableServe records how bills are paid (for example cash or card, amounts, and tips) so
          restaurants can close orders and see their sales. Card payments are processed by the
          restaurant's own payment provider and terminal hardware (such as Square, Clover, or
          Moneris). TableServe never receives, stores, or transmits card numbers and is not a
          party to the payment transaction, and is not a money services business or payment
          processor.
        </p>
      </Section>

      <Section heading="7. Plans, trials, and billing">
        <p>
          Paid subscription plans, their prices, and included features are described on our
          website and may change with notice. Where a free trial is offered, you can cancel any
          time before the trial ends without charge. Fees are non-refundable except where required
          by law.
        </p>
      </Section>

      <Section heading="8. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>use the Service for anything unlawful, deceptive, or harmful;</li>
          <li>interfere with or disrupt the Service or attempt to access data that is not yours;</li>
          <li>place fake orders or otherwise abuse a restaurant's menu;</li>
          <li>reverse engineer, scrape, or resell the Service without our written permission;</li>
          <li>upload content that infringes someone else's rights.</li>
        </ul>
      </Section>

      <Section heading="9. Your content and our platform">
        <p>
          Restaurants keep all rights to the content they upload (menus, photos, logos,
          descriptions) and grant TableServe a licence to host and display that content to provide
          the Service. The TableServe software, design, and branding belong to TableServe and are
          protected by intellectual-property laws.
        </p>
      </Section>

      <Section heading="10. Availability and disclaimers">
        <p>
          The Service is provided "as is" and "as available". We work to keep TableServe fast and
          reliable, but we do not guarantee uninterrupted or error-free operation, and we may
          modify or discontinue features. To the maximum extent permitted by law, we disclaim all
          warranties, express or implied, including fitness for a particular purpose.
        </p>
      </Section>

      <Section heading="11. Limitation of liability">
        <p>
          To the maximum extent permitted by law, TableServe will not be liable for indirect,
          incidental, special, or consequential damages, or for lost profits, revenue, or data,
          arising from your use of the Service. Our total liability for any claim is limited to
          the amount you paid us for the Service in the twelve months before the claim arose, or
          CA$100 if you have not paid us anything.
        </p>
      </Section>

      <Section heading="12. Termination">
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or
          terminate accounts that violate these terms or create risk for the Service, other users,
          or diners. Sections that by their nature should survive termination (such as limitations
          of liability) survive.
        </p>
      </Section>

      <Section heading="13. Changes to these terms">
        <p>
          We may update these terms from time to time. If a change is material, we will give
          notice through the Service or by email before it takes effect. Continuing to use the
          Service after a change takes effect means you accept the updated terms.
        </p>
      </Section>

      <Section heading="14. Governing law">
        <p>
          These terms are governed by the laws of the Province of Ontario and the federal laws of
          Canada applicable in Ontario. Any disputes will be resolved in the courts located in
          Toronto, Ontario.
        </p>
      </Section>

      <Section heading="15. Contact">
        <p>
          Questions about these terms? Email{' '}
          <a href="mailto:chaitanya1kokil@gmail.com" className="font-medium text-brand hover:underline">
            chaitanya1kokil@gmail.com
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  )
}
